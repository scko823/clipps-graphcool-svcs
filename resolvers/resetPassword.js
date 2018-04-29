import { fromEvent } from 'graphcool-lib';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const SALT_ROUNDS = 10;
async function getUserByPwRestSecret(api, pwResetSecret) {
	const query = `
        query getUserByPwRestSecret($pwResetSecret: String!){
			User(pwRestSecret: $pwResetSecret) {
				id
				validated
			}
        }
    `;
	const variables = { pwResetSecret };
	return api.request(query, variables);
}

async function updatePassword(api, id, passwordHash, pwRestSecret) {
	const mutation = `
        mutation updatePassword($id: ID!, $passwordHash: String!, $pwRestSecret: String!){
			updateUser(id: $id, password: $passwordHash, pwRestSecret: $pwRestSecret) {
				id
			}
        }
    `;
	const variables = { id, passwordHash, pwRestSecret };
	return api.request(mutation, variables);
}

export default async event => {
	const graphcool = fromEvent(event);
	const api = graphcool.api('simple/v1');

	const { pwRestSecret, password } = event.data;

	// get user by email
	const user = await getUserByPwRestSecret(api, pwRestSecret).then(r => r.User);

	// no user with this email
	if (!user) {
		return { error: 'Invalid credentials!' };
	}

	if (!user.validated) {
		return { error: 'Email must be validated prior to login' };
	}

	const userId = user.id;

	// create password hash
	const salt = bcrypt.genSaltSync(SALT_ROUNDS);
	const hash = await bcrypt.hash(password, salt);

	const updatedUser = await updatePassword(api, userId, hash, uuidv4()).then(r => r.updateUser);

	if (!updatedUser.id) {
		return { error: 'Unable to reset password' };
	}

	return {
		data: {
			id: updatedUser.id
		}
	};
};
