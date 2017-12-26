/* eslint no-console: "off" */
// https://github.com/graphcool/templates/blob/master/messaging/mailgun/src/sendEmail.ts
const fetch = require('isomorphic-fetch');

const FormData = require('form-data');

const generateHTML = (userEmail, validationSecret) => `
<p>Hi ${userEmail},</p>

<p>Thank you for joining Clipps. When prompted to verify your email, please enter the following secret:</p>

<p>${validationSecret}</p>

<p>Thanks,</p>
<p>Clipps</p>
`;

const EMAIL_FROM = `Welcome to Clipps <no-reply@${process.env.MAILGUN_DOMAIN}>`;
const EMAIL_SUBJECT = 'Welcome to Clipps';

export default async event => {
    if (!process.env.MAILGUN_API_KEY) {
        console.log('Please provide a valid mailgun secret key!');
        return { error: 'Module not configured correctly.' };
    }

    if (!process.env.MAILGUN_DOMAIN) {
        console.log('Please provide a valid mailgun domain!');
        return { error: 'Module not configured correctly.' };
    }
    try {
        const token = Buffer.from(`api:${process.env.MAILGUN_API_KEY}`, 'utf-8').toString('base64');
        const endpoint = `https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`;
        const { email, validationSecret } = event.data;

        // build form for MailGun
        const form = new FormData();
        form.append('from', EMAIL_FROM);
        form.append('to', email);
        form.append('subject', EMAIL_SUBJECT);
        form.append('html', generateHTML(email, validationSecret));

        const result = await fetch(endpoint, {
            headers: {
                Authorization: `Basic ${token}`
            },
            method: 'POST',
            body: form
        }).then(response => response.json());

        console.log('====================result:');
        console.log(JSON.stringify(result));
        return {
            data: event.data
        };
    } catch (e) {
        console.error(e);
        console.log(JSON.stringify(e));
        console.log(e.error);
        return {
            error: 'An unexpected error occured during send validation email.'
        };
    }
};
