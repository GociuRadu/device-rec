const { findByUsername, createUser } = require('./userDAO');

(async () => {
  // lista de utilizatori initiali
  const initialUsers = [
    { username: 'admin1', password: 'admin123', role: 'admin' },
     { username: 'admin2', password: 'admin123', role: 'admin' },
    { username: 'user1', password: '1234',      role: 'user'  }
  ];

  for (const user of initialUsers) {
    const exists = await findByUsername(user.username);
    if (!exists) {
      await createUser(user);
      console.log(`User created: ${user.username} / ${user.password} (${user.role})`);
    } else {
      console.log(`User ${user.username} already exists.`);
    }
  }

  process.exit(0);
})();
