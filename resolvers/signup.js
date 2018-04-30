import { fromEvent } from 'graphcool-lib';
import * as bcrypt from 'bcryptjs';
import * as validator from 'validator';
import { v4 as uuidv4 } from 'uuid';

const SALT_ROUNDS = 10;

async function getUser(api, email) {
	const query = `
    query getUser($email: String!) {
      User(email: $email) {
        id
        validated
      }
    }
  `;

	const variables = {
		email
	};

	return api.request(query, variables);
}

async function createGraphcoolUser(api, firstName, lastName, email, password) {
	const mutation = `
    mutation createGraphcoolUser($firstName: String!, $lastName: String!, $email: String!, $password: String!, $validationSecret: String!, $pwResetSecret: String!) {
      createUser(
        firstName: $firstName,
        lastName: $lastName,
        email: $email,
        password: $password,
        validationSecret: $validationSecret,
        pwResetSecret: $pwResetSecret
      ) {
        id
      }
    }
  `;

	const variables = {
		firstName,
		lastName,
		email,
		password,
		validationSecret: uuidv4(),
		pwResetSecret: uuidv4()
	};

	return api.request(mutation, variables).then(r => r.createUser.id);
}

export default async event => {
	try {
		const graphcool = fromEvent(event);
		const api = graphcool.api('simple/v1');

		const { email, password, firstName, lastName } = event.data;

		if (!validator.isEmail(email)) {
			return {
				error: 'Not a valid email'
			};
		}

		const user = await getUser(api, email).then(r => r.User);
		// check if user exists already
		const userExists = user !== null;
		if (userExists) {
			if (user.validated) {
				return { error: 'Email already in use and validated' };
			}
			return {
				error: 'Email already registered, need email validation'
			};
		}

		// create password hash
		const salt = bcrypt.genSaltSync(SALT_ROUNDS);
		const hash = await bcrypt.hash(password, salt);

		// create new user
		const userId = await createGraphcoolUser(api, firstName, lastName, email, hash);

		return {
			data: {
				id: userId
			}
		};
	} catch (e) {
		return {
			error: 'An unexpected error occured during signup.'
		};
	}
};
