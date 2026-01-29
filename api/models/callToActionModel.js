import mongoose from 'mongoose';

const callToActionSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: true,
  },
  link: {
    type: String,
    default: null,
  },
  altText: {
    type: String,
    default: 'Poster',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
    createdBy: { //use username of the admin
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const CallToAction = mongoose.model('CallToAction', callToActionSchema);

export default CallToAction;




//   createdBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Admin',
//     required: true,
//   },