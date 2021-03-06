const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const admin = require('../../../models/admin');

const AuthController = require('../../../contollers/AuthController');

// Route to Validate Username
router.post('/validate',function(req,res){
    admin.findOne({username:req.body.username}).then(matchedAdmin => {
        if(!matchedAdmin) return res.status(404).json({message : "Admin Doesn't Exist"});
        else return res.status(200).json({message : "Admin Exists",priority : matchedAdmin.priority});
    }).catch(err => {
        return res.status(500).json({message : "Internal Server Error"});
    });
});

// Route to Update Password
router.post('/updatePassword',AuthController.verify_token,AuthController.is_authorized,function(req,res){    
    if(req.decoded.priority == 1) {
        admin.findOne({username:req.body.username}).then(matchedAdmin => {
            if(!matchedAdmin) return res.status(403).json({message : "Admin Not Found"});
            else {
                bcrypt.hash(req.body.newPassword,10,function(err,hash){
                    if(err) res.status(500).json({message : "Password Hashing Failed"});
                    else {
                        matchedAdmin.password = hash;
                        matchedAdmin.save((err,result) => {
                            if(err) return res.status(500).json({message : "Error Saving Admin to Database"});
                            else return res.status(200).json({message : "Admin Password Saved"});
                        });
                    }
                });
            }
        })
        .catch(err => {
            return res.status(500).json({message : "Password Updation Failed"});
        })
    } 
    else if (req.decoded.priority == 2) {
        admin.findOne({username:req.body.username,battalion:req.decoded.battalion}).then(matchedAdmin => {
            if(!matchedAdmin) return res.status(403).json({message : "User Doesn't exist in Battalion"});
            else {
                bcrypt.hash(req.body.newPassword,10,function(err,hash){
                    if(err) res.status(500).json({message : "Password Hashing Failed"});
                    else {
                        matchedAdmin.password = hash;

                        matchedAdmin.save((err,result) => {
                            if(err) return res.status(500).json({message : "Error Saving Admin to Database"});
                            else return res.status(200).json({message : "Admin Password Saved"});
                        });
                    }
                });
            }
        }).catch(err => {
            return res.status(500).json({message : "Internal Server Error"});
        });
    }
    else {
        admin.findOne({username:req.decoded.username}).then(matchedAdmin => {
            if(!matchedAdmin) return res.status(401).json({message : "Authentication Failed"});
            else {
                bcrypt.compare(req.body.password,matchedAdmin.password,function(err,result){
                    if(err) return res.status(500).json({message : "Error Comparing Hashes"});
                    else {
                        if(result) {
                            bcrypt.hash(req.body.newPassword,10,function(_err,hash) {
                                if(_err) return res.status(500).json({message : "Error Hashing Password"});
                                else {
                                    matchedAdmin.password = hash;

                                    matchedAdmin.save((saveErr,result) => {
                                        if(saveErr) return res.status(500).json({message : "Error Saving Admin Details"});
                                        else return res.status(200).json({message : "Admin Password Updated"});
                                    })
                                }
                            });
                        }
                    }
                });
            }
        }).catch(err => {
            return res.status(500).json({message : "Error Fetching Admins"});
        });
    }
});
router.post('/getInfo',AuthController.verify_token,AuthController.is_authorized,function(req,res){
    try{
        if(!req.decoded.company)
            req.decoded.company = null
        if(!req.decoded.battalion)
            req.decoded.battalion = null
        let UserObj = {
            Username : req.decoded.username,
            Priority : req.decoded.priority,
            Battalion : req.decoded.battalion,
            Company : req.decoded.company
        }
        res.status(200).json({User:UserObj});
    }catch(err){
        console.log(err);
        res.status(500).json({message:"Internal Server Error"});
    }
});


module.exports = router;