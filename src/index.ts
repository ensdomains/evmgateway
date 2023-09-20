import dotenv from 'dotenv';
import { makeApp } from './app';

dotenv.config({ path: '../.env' });

const app = makeApp('/');
app.listen(8080);
