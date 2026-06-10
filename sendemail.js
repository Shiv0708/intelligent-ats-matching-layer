const { Resend } = require("resend");
require("dotenv").config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function main(){  
    try{
      const result=await resend.emails.send({
        from:process.env.EMAIL_FROM,
        to:"shivanshibhatt5@gmail.com",
        subject:"Resend Test",
        html:"<p>Hello! This is a test email from Resend.</p>",
      });
      console.log("Success:",result);
    } catch(error){
      console.error("Error:",error);
    }
  }

main();


