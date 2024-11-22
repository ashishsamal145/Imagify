import userModel from "../models/userModel.js";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import validator from 'validator'
import razorpay from 'razorpay'
import transactionModel from "../models/transactionModel.js";


//API for  user registration
const registerUser = async (req, res) => {

    try {
        const { name, email, password } = req.body

        if (!name || !email || !password) {
            return res.json({ success: false, message: "Missing Details" })
        }

        //checking user already exists or not 
        const exists = await userModel.findOne({ email })
        if (exists) {
            return res.json({ success: false, message: "User already exists" })
        }

        //validating email format and strong password
        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Invalid Email. Please enter a valid email" })
        }
        if (password.length < 8) {
            return res.json({ success: false, message: "Please enter a strong password" })
        }


        //Hashing user password
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const userData = {
            name,
            email,
            password: hashedPassword
        }

        const newUser = new userModel(userData)
        const user = await newUser.save()

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)
        res.json({ success: true, token, user: { name: user.name } })



    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

//API for user login

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body

        const user = await userModel.findOne({ email })

        if (!user) {
            return res.json({ success: false, message: "User does not exist" })
        }

        const isMatch = await bcrypt.compare(password, user.password)

        if (isMatch) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET)
            res.json({ success: true, token, user: { name: user.name } })

        }
        else {
            res.json({ success: false, message: "Invalid Credentails" })

        }

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

//API for to user credit

const userCredits = async (req, res) => {

    try {
        const { userId } = req.body

        const user = await userModel.findById(userId)

        res.json({ success: true, credits: user.creditBalance, user: { name: user.name } })


    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }

}


//API to make payment of appointment using razorpay

const razorpayInstance = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
})

const paymentRazorpay = async (req, res) => {

    try {

        const { userId, planId } = req.body

        const userData = await userModel.findById(userId)

        if (!userId || !planId) {
            return res.json({ success: false, message: "Missing Details" })
        }

        let credits, plan, amount, date;

        switch (planId) {
            case 'Basic':
                plan = 'Basic'
                credits = 100
                amount = 10
                break;
            case 'Advanced':
                plan = 'Advanced'
                credits = 500
                amount = 50
                break;
            case 'Business':
                plan = 'Business'
                credits = 5000
                amount = 250
                break;


            default:
                return res.json({ success: false, message: "Plan Not Found" })
        }

        date = Date.now()

        const transactionData = {
            userId,
            plan,
            amount,
            credits,
            date
        }

        const newTransaction = await transactionModel.create(transactionData)

        //creating options for razorpay payment
        const options = {
            amount: amount * 100,
            currency: process.env.CURRENCY,
            receipt: newTransaction._id
        }

        //creation of an order

        const order = await razorpayInstance.orders.create(options, (error, order) => {
            if (error) {
                console.log(error);
                res.json({ success: false, message: error.message })

            }
            else {
                res.json({ success: true, order })
            }
        })

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

const verifyRazorpay = async (req, res) => {
    try {

        const { razorpay_order_id } = req.body
        const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id)

        if (orderInfo.status === 'paid') {
            const transactionData = await transactionModel.findById(orderInfo.receipt)
            if (transactionData.payment) {
                return res.json({ success: false, message: "Payment Failed" })
            }

            const userData = await userModel.findById(transactionData.userId);
            const creditBalance = userData.creditBalance + transactionData.credits;

            await userModel.findByIdAndUpdate(userData._id, { creditBalance })

            await transactionModel.findByIdAndUpdate(transactionData._id,{payment:true})

            res.json({success:true,message:"Credits Added"})
        }else
        {
            res.json({success:false,message:"Payment Failed"})
        }

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}



export { registerUser, loginUser, userCredits, paymentRazorpay, verifyRazorpay }

