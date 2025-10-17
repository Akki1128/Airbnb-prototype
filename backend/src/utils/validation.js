import Joi from 'joi';

export const signupSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(72).required(),
  role: Joi.string().valid('TRAVELER', 'OWNER').default('TRAVELER')
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const profileUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(120),
  email: Joi.string().email(),
  phone: Joi.string().allow('', null),
  about: Joi.string().allow('', null),
  city: Joi.string().allow('', null),
  state: Joi.string().length(2).uppercase().allow('', null),
  country: Joi.string().allow('', null),
  languages: Joi.string().allow('', null),
  gender: Joi.string().valid('male', 'female', 'nonbinary', 'prefer_not_to_say').allow(null)
});

export const searchSchema = Joi.object({
  city: Joi.string().required(),
  start: Joi.date().iso().required(),
  end: Joi.date().iso().required(),
  guests: Joi.number().integer().min(1).required(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20)
});
