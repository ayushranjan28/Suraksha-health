const Delegate = require('../models/Delegate');
const User = require('../models/User');

exports.addDelegate = async (req, res, next) => {
  try {
    const { email } = req.body;
    const patientId = req.user.userId;

    if (req.user.role !== 'patient') {
      return res.status(403).json({ error: 'Only patients can add delegates' });
    }

    const delegateUser = await User.findByEmail(email);
    if (!delegateUser) {
      return res.status(404).json({ error: 'User with that email not found' });
    }

    if (delegateUser.id === patientId) {
      return res.status(400).json({ error: 'You cannot delegate to yourself' });
    }

    const delegate = await Delegate.addDelegate(patientId, delegateUser.id);
    res.status(201).json({ message: 'Delegate added successfully', delegate });
  } catch (error) {
    next(error);
  }
};

exports.removeDelegate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const patientId = req.user.userId;

    if (req.user.role !== 'patient') {
      return res.status(403).json({ error: 'Only patients can remove delegates' });
    }

    await Delegate.removeDelegate(id, patientId);
    res.json({ message: 'Delegate removed successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getDelegates = async (req, res, next) => {
  try {
    const patientId = req.user.userId;

    if (req.user.role !== 'patient') {
      return res.status(403).json({ error: 'Only patients can view delegates' });
    }

    const delegates = await Delegate.getDelegates(patientId);
    res.json({ delegates });
  } catch (error) {
    next(error);
  }
};
