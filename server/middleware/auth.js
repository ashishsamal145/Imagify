import jwt from 'jsonwebtoken'


//User authentication middleware

const userAuth = async (req, res, next) => {
    try {

        const { token } = req.headers
        if (!token) {
            return res.json({ success: false, message: "Not Authorised. Login Again" })
        }

        const token_decode = jwt.verify(token, process.env.JWT_SECRET)
        if(token_decode){
            req.body.userId = token_decode.id

        }else{
            res.json({ success: false, message: "Not Authorised. Login Again" })
        }
        next();

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

export default userAuth