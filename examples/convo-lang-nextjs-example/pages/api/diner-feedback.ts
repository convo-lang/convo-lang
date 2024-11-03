// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";


export default function handler(
    req:NextApiRequest,
    res:NextApiResponse
){
    console.log('Custom Feedback 👋 🫣',req.body);
    res.status(204).send('')
}
