import { POST as validatePost, GET as validateGet } from '../validate/route';

export async function POST(req: Request) {
  return validatePost(req);
}

export async function GET(req: Request) {
  return validateGet(req);
}
