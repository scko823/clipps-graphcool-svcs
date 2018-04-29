import { fromEvent } from 'graphcool-lib';
import { v4 as uuidv4 } from 'uuid';
import * as validator from 'validator';

import getUserByEmail from '../utils/user';

async function setUserPWResetSecret(api, pwResetSecret, id) {
	const mutation = `
        mutation setPasswordResetSecret($pwResetSecret: String!, $id: ID!){
			updateUser(id: $id, pwRestSecret: $pwResetSecret) {
				id
				email
			}
        }
    `;
	const variables = { id, pwResetSecret };
	return api.request(mutation, variables);
}

export default async event => {
	const graphcool = fromEvent(event);
	const api = graphcool.api('simple/v1');

	const { email } = event.data;

	// get user by email
	const user = await getUserByEmail(api, email).then(r => r.User);

	// no user with this email
	if (!user) {
		return { error: 'Invalid credentials!' };
	}

	if (!user.validated) {
		return { error: 'Email must be validated prior to login' };
	}

	const pwResetSecret = uuidv4();
	const { id: userId } = user;
	const mutateUserPayload = await setUserPWResetSecret(api, pwResetSecret, userId);
	const { updateUser } = mutateUserPayload;

	if (!updateUser.email || !validator.isEmail(updateUser.email)) {
		return { error: 'Unable to process password reset request' };
	}
	return {
		data: {
			email: updateUser.email
		}
	};
};
