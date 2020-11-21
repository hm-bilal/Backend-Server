const {check, validationResult} = require('express-validator');
const jwt = require('jsonwebtoken');
const jwt_secret = process.env['JWT_SECRET'];
const admin = require('../models/admin');

exports._sign_in_checks = [
    check('username').exists(),
    check('password').isLength({min: 6}).exists()
];

exports._register_checks = [
    check('username').not().isEmpty,
    check('password').isLength({min:6}),
    check('personnelID').not().isEmpty
];

exports.verify_token = function(req,res,next){
    let token = req.body.token;
    if(token){
        token = /^(Bearer\x\S*)$/.test(token) ? token.split(' ')[1] : token;
        
        jwt.verify(token,jwt_secret, function(err, decoded){
            if(err) return res.status(500).json({message:"Internal Server Error"});

            if(decoded.username){
                admin.findOne({username:decoded.username}).then(matchedAdmin => {
                    if(!matchedAdmin) return res.status(401).json({message:"Unauthorized"});
                    else {
                        req.decoded = decoded;
                        req.decoded.priority = matchedAdmin.priority;
                        next();
                    }
                }).catch(err => {
                    return res.status(500).json({message:"Internal Server Error"});
                });
            }
            else return res.status(401).json({message:"Authentication Failed"});
        });
    }
    else return res.status(401).json({message:"Authentication Failed"});
}