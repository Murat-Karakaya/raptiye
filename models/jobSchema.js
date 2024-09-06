const mongoose=require('mongoose');

const jobSchema = new mongoose.Schema({
	jobTitle: {
	  type: String,
	  required: true,
	  trim: true,
	},
	date: {
	  type: Date,
	  required: true,
	},
	description: {
	  type: String,
	  required: true,
	  trim: true,
	},
	price: {
	  type: Number,
	  required: true,
	},
	images: {
	  type: [String],
	},
	createdAt: {
	  type: Date,
	  default: Date.now,
	},
	owner:{
		type: String,
	}
  });
  
  const Job = mongoose.model('Job', jobSchema);
  
  module.exports = Job;