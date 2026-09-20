import validateHandler from './validate.js';

export default async function handler(req: any, res: any) {
  return validateHandler(req, res);
}
