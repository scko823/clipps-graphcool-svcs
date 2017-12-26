import { fromEvent } from 'graphcool-lib';
import * as validator from 'validator';

async function getUser(api, email) {
    const query = `
    query getUser($email: String!) {
      User(email: $email) {
        id,
        email,
        id,
        validated,
        validationSecret
      }
    }
  `;

    const variables = {
        email
    };

    return api.request(query, variables);
}

async function validateEmailMutation(api, id) {
    const mutation = `
    mutation validateUserEmail($id: ID!){
        updateUser(id: $id, validated: true){
            id
            validated
            email
        }
    }
  `;

    const variables = {
        id
    };

    return api.request(mutation, variables).then(r => r.updateUser);
}

export default async event => {
    try {
        const graphcool = fromEvent(event);
        const api = graphcool.api('simple/v1');

        const { email, validationSecret } = event.data;
        const validationFailError = {
            error: 'Email validation fail'
        };
        if (!validator.isEmail(email)) {
            return {
                error: 'Not a valid email'
            };
        }

        const userPayload = await getUser(api, email);
        // check if user exists already
        const userExists = userPayload.User !== null;
        if (!userExists) {
            return validationFailError;
        }
        const user = userPayload.User;
        const userId = user.id;
        if (user.validationSecret === validationSecret) {
            await validateEmailMutation(api, userId);
            return {
                data: {
                    id: userId,
                    validated: true
                }
            };
        }
        return validationFailError;
    } catch (e) {
        return {
            error: 'An unexpected error occured during validate email.'
        };
    }
};
