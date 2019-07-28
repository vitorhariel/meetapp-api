import * as Yup from 'yup';
import User from '../models/User';
import File from '../models/File';

class UserController {
  async store(req, res) {
    const validationSchema = Yup.object().shape({
      name: Yup.string().required('Name not provided.'),
      email: Yup.string()
        .email('Email must be a valid email.')
        .required('Email not provided.'),
      password: Yup.string()
        .required('Password not provided.')
        .min(6, 'Password must > 6 characters.'),
    });

    try {
      await validationSchema.validate(req.body, {
        abortEarly: false,
      });
    } catch (err) {
      return res.status(400).json({ error: err.errors });
    }

    const userExists = await User.findOne({ where: { email: req.body.email } });

    if (userExists) {
      return res.status(400).json({ error: 'User already exists.' });
    }

    const { id, name, email } = await User.create(req.body);

    return res.status(201).json({
      id,
      name,
      email,
    });
  }

  async update(req, res) {
    const validationSchema = Yup.object().shape({
      name: Yup.string().required(),
      email: Yup.string()
        .email('Email must be a valid email.')
        .required(),
      oldPassword: Yup.string()
        .min(6, 'Old password must be > 6 characters.')
        .when('password', (password, field) =>
          password ? field.required('Old password not provied') : field
        ),
      password: Yup.string().min(6, 'Password must be > 6 characters.'),
      confirmedPassword: Yup.string()
        .min(6, 'Confirmed password must be > 6 characters.')
        .when('password', (password, field) =>
          password
            ? field
                .required('Confirmed password not provided.')
                .oneOf(
                  [Yup.ref('password')],
                  'Confirmed password does not match.'
                )
            : field
        ),
      avatar_id: Yup.number(),
    });

    try {
      await validationSchema.validate(req.body, {
        abortEarly: false,
      });
    } catch (err) {
      return res.status(400).json({ error: err.errors });
    }

    const { email, oldPassword } = req.body;

    const user = await User.findByPk(req.userId);

    if (email !== user.email) {
      const userExists = await User.findOne({ where: { email } });

      if (userExists) {
        return res.status(400).json({ error: 'Email already in use.' });
      }
    }

    if (oldPassword && !(await user.checkPassword(oldPassword))) {
      return res.status(400).json({ error: 'Password does not match.' });
    }

    await user.update(req.body);

    const { id, name, avatar } = await User.findByPk(req.userId, {
      include: [
        {
          model: File,
          as: 'avatar',
          attributes: ['path', 'url', 'name'],
        },
      ],
    });

    return res.status(200).json({
      id,
      name,
      email,
      avatar,
    });
  }
}

export default new UserController();
