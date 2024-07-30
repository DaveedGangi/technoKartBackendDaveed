const express = require('express');
const path=require('path');

const {open} = require('sqlite');
const sqlite3 = require('sqlite3');

const bcrypt = require('bcrypt');

const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

let cors = require('cors');
app.use(cors());

const dbPath = path.join(__dirname, "userData.db");

let db = null;

// function to intialize database and server 
let intializeDatabaseAndServer=async()=>{
    try{
        db=await open({
            filename:dbPath,
            driver:sqlite3.Database
        });

        // Create comments table if not exists
        await db.run(`
            CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER,
                author_id INTEGER,
                content TEXT,
                approved INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES posts (id),
                FOREIGN KEY (author_id) REFERENCES users (id)
            );
        `);


        app.listen(3000,()=>{
            console.log("Server running at http://localhost:3000/");
        })
    }
    catch(e){
        console.log(`DB Error:${e.message}`);
        process.exit(1);
    }
}

intializeDatabaseAndServer();


app.post("/register/", async (request, response) => {
    const { username, password,role} = request.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword);

    const selectUserQuery = `SELECT * FROM users WHERE username = '${username}';`;

    const dbUser = await db.get(selectUserQuery);
    if (dbUser === undefined) {
        const createUserQuery = `
            INSERT INTO
                users ( username, password,role)
            VALUES
                (
                    '${username}',
                    '${hashedPassword}',
                    '${role}'
                );`;
        const dbResponse = await db.run(createUserQuery);
        response.status(200);
        response.send({ message: "User created successfully",status: "success" });
     
    } else {
        response.status(400);
        
        response.send({errorMessage:"User already exists",statusbar:"failed"});
    }

  });


// login user
  app.post("/login/", async (request, response) => {
    const { username, password } = request.body;

    const selectUserQuery = `SELECT * FROM users WHERE username = '${username}';`;
    const dbUser = await db.get(selectUserQuery);


    if (dbUser === undefined) {
        response.status(400);
        
        response.send({ errorMessage:"Invalid user",statusbar: "failed" });
    } else {
        const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
        if (isPasswordMatched === true) {
            const payload = {
                username: username,
            };
            const jwtToken = jwt.sign(payload, "MY_SECRET_KEY");
            response.send({ jwtToken: jwtToken,statusbar: 'success',username:username,role:dbUser.role,id:dbUser.id });


        } else {
            response.status(400);
            response.send({errorMessage: "Invalid password",statusbar: 'failed'});
        }
    }

  });



  
  // create notes
  app.post("/postsAdd/", async (request, response) => {
    const { title, content,image,author_id,status } = request.body;

    const inesertingQuery = `INSERT INTO posts (title,content,image,author_id,status) VALUES ('${title}','${content}','${image}','${author_id}','${status}');`;

    const dbResponse = await db.run(inesertingQuery);
    response.status(200);
    response.send("post created successfully");
    

  });

  // get all notes
  app.get("/allPosts/", async (request, response) => {
    const selectQuery = `SELECT * FROM posts;`;
    const dbResponse = await db.all(selectQuery);
    response.status(200);
    response.send(dbResponse);

    });


    // delete each notes
    app.delete("/postDelete/:id", async (request, response) => {
    const { id } = request.params;
    const deleteQuery = `DELETE FROM posts WHERE id = ${id};`;
    const dbResponse = await db.run(deleteQuery);
    response.status(200);
    response.send("Note deleted successfully");

    });

    // update each notes
    app.put("/postUpdate/:id", async (request, response) => {
    const { id } = request.params;
    const { title, content,image,author_id,status } = request.body;
    const updateQuery = `UPDATE posts SET title = '${title}', content = '${content}',image = '${image}',author_id='${author_id}',status='${status}' WHERE id = '${id}';`;
    const dbResponse = await db.run(updateQuery);
    response.status(200);
    response.send("Note updated successfully");
    });
   
   

// comments add

app.post("/commentsAdd/", async (request, response) => {
    const { post_id, author_id, content} = request.body;
    const inesertingQuery = `INSERT INTO comments (post_id,author_id,content) VALUES ('${post_id}','${author_id}','${content}');`;
    const dbResponse = await db.run(inesertingQuery);
    response.status(200);
    response.send("comment created successfully");
});

// get all comments
app.get("/allComments/", async (request, response) => {
    const selectQuery = `SELECT * FROM comments;`;
    const dbResponse = await db.all(selectQuery);
    response.status(200);
    response.send(dbResponse);
});

// comment approve 

app.put("/commentApprove/:id", async (request, response) => {
    const { id } = request.params;
    const updateQuery = `UPDATE comments SET approved = 1 WHERE id = '${id}';`;
    const dbResponse = await db.run(updateQuery);
    response.status(200);
    response.send("comment approved successfully");
});

// comment delete 

app.delete("/commentDelete/:id", async (request, response) => {
    const { id } = request.params;
    const deleteQuery = `DELETE FROM comments WHERE id = ${id};`;
    const dbResponse = await db.run(deleteQuery);
    response.status(200);
    response.send("comment deleted successfully");
});

// comment Unapprove

app.put("/commentUnapprove/:id", async (request, response) => {
    const { id } = request.params;
    const updateQuery = `UPDATE comments SET approved = 0 WHERE id = '${id}';`;
    const dbResponse = await db.run(updateQuery);
    response.status(200);
    response.send("comment unapproved successfully");
});