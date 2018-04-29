import { fromEvent } from 'graphcool-lib';
import * as bcrypt from 'bcryptjs';
import getUserByEmail from '../utils/user';

export default async event => {
	try {
		const graphcool = fromEvent(event);
		const api = graphcool.api('simple/v1');

		const { email, password: passwordAttempt } = event.data;

		// get user by email
		const user = await getUserByEmail(api, email).then(r => r.User);

		// no user with this email
		if (!user) {
			return { error: 'Invalid credentials!' };
		}

		if (!user.validated) {
			return { error: 'Email must be validated prior to login' };
		}

		// check password
		const passwordIsCorrect = await bcrypt.compare(passwordAttempt, user.password);
		if (!passwordIsCorrect) {
			return { error: 'Invalid credentials!' };
		}

		// generate node token for existing User node
		const token = await graphcool.generateNodeToken(user.id, 'User');

		return {
			data: {
				firstName: user.firstName,
				lastName: user.lastName,
				id: user.id,
				token
			}
		};
	} catch (e) {
		console.error(e); // eslint-disable-line no-console
		return { error: 'An unexpected error occured during authentication.' };
	}
};
