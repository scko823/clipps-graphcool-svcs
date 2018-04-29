import { fromEvent } from 'graphcool-lib';
import { v4 as uuidv4 } from 'uuid';
import * as validator from 'validator';
import getUserByEmail from '../utils/user';

const fetch = require('isomorphic-fetch');

const FormData = require('form-data');

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

	// ==== send email
	const token = Buffer.from(`api:${process.env.MAILGUN_API_KEY}`, 'utf-8').toString('base64');
	const endpoint = `https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`;

	const emailFrom = `Password Rest for Clipps <no-reply@${process.env.MAILGUN_DOMAIN}>`;
	const emailTo = updateUser.email;
	const emailSubject = 'Password Reset for Clipps';
	const generateHtml = (userEmail, secret) => `
<p>Hi ${userEmail},</p>

<p>We had recieved your request to reset your password on Clipps. When prompted, please provide the following secret:</p>

<p>${secret}</p>

<p>Thanks,</p>
<p>Clipps</p>
`;

	// build form for MailGun
	const form = new FormData();
	form.append('from', emailFrom);
	form.append('to', emailTo);
	form.append('subject', emailSubject);
	form.append('html', generateHtml(email, pwResetSecret));

	await fetch(endpoint, {
		headers: {
			Authorization: `Basic ${token}`
		},
		method: 'POST',
		body: form
	})
		.then(response => response.json())
		.then(r => console.log(JSON.stringify(r)))
		.catch(err => {
			console.log('mail gun fail');
			console.err(err);
		});
	// ===
	return {
		data: {
			email: updateUser.email
		}
	};
};
