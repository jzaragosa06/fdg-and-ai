# Brainstorm AI

This is an end term requirement for system integration and architecture (SIA). The project is built using Node.js's express web framework. Ejs is used as the templating engine. For the database, MySQL was used.

### Setup

1. Fork the repository.
2. In the terminal, run `npm install` to install dependencies.
   a. Run `npm install -g knex` just to make sure.
3. Start the mysql database.
4. Create a database and name it as `brainstorm_ai_db`.
5. Run `knex migrate:latest` in the terminal to create the tables.
6. Run `knex seed:run` to populate the content of the admin table.
7. In the terminal, run `npm start` to start the server. The web app is accessible through port `3000`, e.g., `localhost:3000/`.
8. navigate to `localhost:3000/home` to explore the initial features of the web app.

### About the file structure of the project:

1.  In brainstorm1 views, it includes all the pages responsible for the feature of browsing wikipedia, extracting raw text, and transtorming raw text using LLM.
2.  In brainstorm2 views, it includes the pages for the features of hightlighting a text from a wikipedia and generating a force directed graph.
3.  In the auth views folder, the login, register, terms and conditions are stored.

##### Basic Routing

1. `localhost:3000/` navigates to the landing page
2. `localhost:3000/home` navigates to to the home page (DASHBOARD).
3. `localhost:3000/auth/login` navigates to the login page
4. `localhost:3000/auth/register` navigates to the register page

#### About the approach for Database

1. We will use raw sql statements instead of using models. We can use `sequelize` package with its object relational mapping, but it has syntax very different from PHP.
2. We will just use the `knex` for creating a migration file and running the migration to create the database tables.

3. Run `knex seed:run` on the terminal to populate the admins table
