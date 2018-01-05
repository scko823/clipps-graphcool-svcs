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
    email,
  };

  return api.request(query, variables);
}

async function createGraphcoolUser(api, email, password) {
  const mutation = `
    mutation createGraphcoolUser($email: String!, $password: String!, $validationSecret: String!) {
      createUser(
        email: $email,
        password: $password,
        validationSecret: $validationSecret
      ) {
        id
      }
    }
  `;

  const variables = {
    email,
    password,
    validationSecret: uuidv4(),
  };

  return api.request(mutation, variables).then(r => r.createUser.id);
}

export default async (event) => {
  try {
    const graphcool = fromEvent(event);
    const api = graphcool.api('simple/v1');

    const { email, password } = event.data;

    if (!validator.isEmail(email)) {
      return {
        error: 'Not a valid email',
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
        error: 'Email already registered, need email validation',
      };
    }

    // create password hash
    const salt = bcrypt.genSaltSync(SALT_ROUNDS);
    const hash = await bcrypt.hash(password, salt);

    // create new user
    const userId = await createGraphcoolUser(api, email, hash);

    // generate node token for new User node
    // const token = await graphcool.generateNodeToken(userId, 'User');

    return {
      data: {
        id: userId,
      },
    };
  } catch (e) {
    return {
      error: 'An unexpected error occured during signup.',
    };
  }
};
