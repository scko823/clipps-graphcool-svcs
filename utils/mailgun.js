const fetch = require('isomorphic-fetch');
const FormData = require('form-data');

export default function sendMailGun(
	emailFrom,
	emailTo,
	emailSubject,
	html,
	MAILGUN_TOKEN,
	MAILGUN_ENDPOINT
) {
	if (!MAILGUN_TOKEN) {
		console.error('Please provide a MAILGUN_TOKEN');
		return {
			error: 'Module not configured correctly.'
		};
	}

	if (!MAILGUN_ENDPOINT) {
		console.error('Please provide a MAILGUN_ENDPOINT');
		return {
			error: 'Module not configured correctly.'
		};
	}

	const form = new FormData();
	form.append('from', emailFrom);
	form.append('to', emailTo);
	form.append('subject', emailSubject);
	form.append('html', html);

	return fetch(MAILGUN_ENDPOINT, {
		headers: {
			Authorization: `Basic ${MAILGUN_TOKEN}`
		},
		method: 'POST',
		body: form
	}).then(response => response.json());
}
