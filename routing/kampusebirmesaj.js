const express = require('express');
const router = express.Router();
const allMiddlewares = require('../middlewares.js');
const Kampusemesaj = require('../models/kampusemesajSchema.js');
const User = require('../models/userSchema');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

router.get('/kampusebirmesajbirak', allMiddlewares.requireAuth, (req, res) => {
	res.render('kampusebirmesajver');
})


router.post('/kampusebirmesajbirak', allMiddlewares.requireAuth, async (req, res) => {
	try {
		const message = req.body.mesaj;
		let user;
		const isAnonim = !!req.body.anonim;

		const maxWidth = 600;
		const quality = 50;

		if (isAnonim) {
			user = null;
		} else {
			const userid = await User.findById(req.session.userId);
			user = userid._id;
		}
		
		let imagePath = null;
		
		// Dosya var mı kontrolü
		if (req.files && req.files.images) {
			try {
				const image = req.files.images;
				const date = new Date().toISOString().replace(/:/g, '-');
				imagePath = path.resolve(__dirname, '../public/img/kampusemesajimages', date+image.name);

				await sharp(image.data)
					.resize(maxWidth)
					.jpeg({ quality: quality })
					.toFile(imagePath);
				
				imagePath = `/img/kampusemesajimages/${date+image.name}`;
			} catch (error) {
				return res.render('errorpage', { message: "Bir hata oluştu: " + error.message });
			}
		}

		await Kampusemesaj.create({
			mesaj: message,
			owner: user,
			images:imagePath
		})
		res.redirect('/kampusemesajlar');
	} catch (error) {
		res.status(400).send('bir şeyler yanlış gitti');
	}

})

router.get('/kampusemesajlar', allMiddlewares.requireAuth, async (req, res) => {
	const sortOption = req.query.sort;
	const userId = req.session.userId;
	let messages;

	// Sıralama seçeneğine göre sorguyu değiştiriyoruz
	if (sortOption === 'topVotes') {
		// Upvote ve downvote toplamına göre sıralama
		messages = await Kampusemesaj.find({})
		.sort({ upvotes: -1 })
		.populate('owner')
		.populate('yorumlar.owner')
		.exec();

	}else if (sortOption === 'worstVotes') {
		// Upvote ve downvote toplamına göre sıralama
		messages = await Kampusemesaj.find({})
		.sort({ downvotes: -1 })
		.populate('owner')
		.populate('yorumlar.owner')
		.exec();

	}  else if (sortOption === 'myMessages') {
		// Sadece kullanıcının mesajlarını çekme
		messages = await Kampusemesaj.find({ owner: userId })
			.populate('owner')
			.populate('yorumlar.owner')
			.exec();

	} else {
		// Default: Yeniden eskiye sıralama (createdAt alanına göre)
		messages = await Kampusemesaj.find({})
			.sort({ createdAt: -1 })
			.populate('owner')
			.populate('yorumlar.owner')
			.exec();
	}

	// Kullanıcının kendi mesajlarını ayrıca çekiyoruz (istenirse diğer seçeneklerde de kullanılabilir)
	const myMessages = await Kampusemesaj.find({ owner: userId });

	res.render('kampusemesajlar', { messages, userId, myMessages,sortOption });
});


router.post('/deletekampusmesaj/:kampusemesajid', allMiddlewares.requireAuth, async (req, res) => {
	const kampusemesajid = req.params.kampusemesajid;
	try {
		const currentUser=await User.findById(req.session.userId);
		const currentMessage=await Kampusemesaj.findById(kampusemesajid);

		
		if(currentUser && currentMessage && currentUser._id.equals(currentMessage.owner)){
			if (currentMessage.images) {
					const fullImagePath = path.join(__dirname, '../public', currentMessage.images);
					try {
						fs.unlinkSync(fullImagePath);
						console.log(`Image deleted: ${fullImagePath}`);
					} catch (error) {
						console.error(`Failed to delete image: ${fullImagePath}`, error);
					}
			}
			await Kampusemesaj.findByIdAndDelete(kampusemesajid);
			res.redirect('/kampusemesajlar');
		}else{
			res.status(403).send('Bu mesajı silme izniniz yok.');
		}
	} catch (error) {
		console.error('Mesaj silinirken bir hata oluştu:', error);
		res.status(500).send('Bir hata oluştu. Lütfen tekrar deneyin.');
	}
})

router.post('/upvote/:mesajid', allMiddlewares.requireAuth, async (req, res) => {
	try {
		const mesajid = req.params.mesajid;
		const message = await Kampusemesaj.findById(mesajid);

		if (message) {
			if (!message.downVoters.includes(req.session.userId)) {
				if (!message.upVoters.includes(req.session.userId)) {
					message.upVoters.push(req.session.userId);
					message.upvotes += 1;
				}
				await message.save();
				res.json({ success: true, type: 'upvote', newUpvoteCount: message.upvotes, newDownvoteCount: message.downvotes });
			}
			else if (message.downVoters.includes(req.session.userId)) {
				message.upVoters.push(req.session.userId);
				message.upvotes += 1;
				message.downVoters.pull(req.session.userId);
				message.downvotes -= 1;

				await message.save();
				res.json({ success: true, type: 'upvote', newUpvoteCount: message.upvotes, newDownvoteCount: message.downvotes });
			}

		} else {
			res.status(404).send('Mesaj bulunamadı.');
		}

	} catch (error) {
		res.status(500).send('something went wrong');
	}
})

router.post('/downvote/:mesajid', allMiddlewares.requireAuth, async (req, res) => {
	try {
		const messageId = req.params.mesajid;
		const message = await Kampusemesaj.findById(messageId);

		if (message) {
			// Downvote işlemi
			if (!message.upVoters.includes(req.session.userId)) {
				if (!message.downVoters.includes(req.session.userId)) {
					message.downVoters.push(req.session.userId);
					message.downvotes += 1;
				}
				await message.save();
				res.json({ success: true, type: 'downvote', newUpvoteCount: message.upvotes, newDownvoteCount: message.downvotes });
			} else if (message.upVoters.includes(req.session.userId)) {
				message.downVoters.push(req.session.userId);
				message.downvotes += 1;
				message.upVoters.pull(req.session.userId);
				message.upvotes -= 1;

				await message.save();
				res.json({ success: true, type: 'downvote', newUpvoteCount: message.upvotes, newDownvoteCount: message.downvotes });
			}

		} else {
			res.status(404).send('Mesaj bulunamadı.');
		}
	} catch (error) {
		res.status(500).send('Sunucu hatası.');
	}
})

router.post('/undo-upvote/:id', allMiddlewares.requireAuth, async (req, res) => {
	try {
		const messageId = req.params.id;
		const message = await Kampusemesaj.findById(messageId);

		if (message) {
			if (message.upVoters.includes(req.session.userId)) {
				message.upVoters.pull(req.session.userId);
				message.upvotes -= 1;
			}
			await message.save();
			res.json({ success: true, type: 'undo-upvote', newUpvoteCount: message.upvotes, newDownvoteCount: message.downvotes });
		} else {
			res.status(404).send('Mesaj bulunamadı.');
		}
	} catch (error) {
		res.status(500).send('Sunucu hatası.');
	}
});


router.post('/undo-downvote/:id', allMiddlewares.requireAuth, async (req, res) => {
	try {
		const messageId = req.params.id;
		const message = await Kampusemesaj.findById(messageId);

		if (message) {
			if (message.downVoters.includes(req.session.userId)) {
				message.downVoters.pull(req.session.userId);
				message.downvotes -= 1;
			}
			await message.save();
			res.json({ success: true, type: 'undo-downvote', newUpvoteCount: message.upvotes, newDownvoteCount: message.downvotes });
		} else {
			res.status(404).send('Mesaj bulunamadı.');
		}
	} catch (error) {
		res.status(500).send('Sunucu hatası.');
	}
});

router.post('/add-comment', allMiddlewares.requireAuth, async (req, res) => {
	try {
		const { messageId, yorum } = req.body;
		const userId = req.session.userId;

		await Kampusemesaj.findByIdAndUpdate(
			messageId,  // Formdan gelen messageId'yi kullanarak ilgili mesajı buluruz
			{
				$push: {
					yorumlar: {
						yorum: yorum,
						owner: userId,  // Yorum sahibi olarak kullanıcı ID'si eklenir
						createdAt: new Date()  // Yorumun oluşturulma zamanı
					}
				}
			},
			{ new: true }  // Güncellenmiş belgeyi döndür
		);
		res.redirect('/kampusemesajlar');
	} catch (error) {
		console.error('Yorum eklenirken hata oluştu:', error);
		res.status(500).send('Yorum eklenirken bir hata oluştu.');

	}
})

module.exports = router;