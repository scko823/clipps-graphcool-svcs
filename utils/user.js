async function getUserByEmail(api, email) {
	const query = `
    query getUserByEmail($email: String!) {
      User(email: $email) {
        id
        password
        firstName
        lastName
        validated
      }
    }
  `;

	const variables = {
		email
	};

	return api.request(query, variables);
}

export default { getUserByEmail };
