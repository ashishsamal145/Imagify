import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectDB from './config/mongodb.js'
import userRouter from './routes/userRoute.js'
import imageRouter from './routes/imageRoute.js'

const PORT = process.env.PORT || 4000
const app = express()


//middlewares
app.use(express.json())
app.use(cors())
await connectDB()



//API endpoints
app.use('/api/user',userRouter)
app.use('/api/image',imageRouter)


app.get('/',(req,res)=>{
    res.send('API HooHoo!!!!!!')
})


app.listen(PORT,()=>console.log("Server started on "+PORT))

