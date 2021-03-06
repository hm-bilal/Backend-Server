const express = require("express");
const router = express.Router();

const personnel = require("../../../models/personnel");
const personnelHealth = require("../../../models/personnelHealth");
const ObjectId = require("mongodb").ObjectId;
const AuthController = require("../../../contollers/AuthController");
const { findOne, find } = require("../../../models/personnel");
const company = require("../../../models/company");
const healthParameter = require("../../../models/healthParameter");

const record = require('../../../models/personnelHealth');


const HealParam = require("../../../models/healthParameter");
const { body } = require("express-validator");

router.post(
  "/view",
  AuthController.verify_token,
  AuthController.is_authorized,
  function (req, res) {
    let average = 0;
    const averagePromise = new Promise((resolve, reject) => {
      if (req.decoded.priority == 3) {
        personnel
          .find({ company: ObjectId(req.decoded.company) })
          .then((personnels) => {
            personnels.forEach((person, i) => {
              personnelHealth
                .findOne({
                  _id: ObjectId(
                    person.allEntries[person.allEntries.length - 1]
                  ),
                })
                .then((matchedRecord) => {
                  average += matchedRecord.score;
                  if (i == personnels.length - 1) resolve(average / i);
                })
                .catch((err) => {
                  reject();
                });
            });
          })
          .catch((err) => {
            return res.status(500).json({ message: "Internal Server Error" });
          });
      } else {
        personnel
          .find()
          .then((personnels) => {
            personnels.forEach((person, i) => {
              console.log(person.allEntries[person.allEntries.length - 1]);
              personnelHealth
                .findOne({
                  _id: ObjectId(
                    person.allEntries[person.allEntries.length - 1]
                  ),
                })
                .then((matchedRecord) => {
                  average += matchedRecord.score;
                  if (i == personnels.length - 1) resolve(average / i);
                })
                .catch((err) => {
                  reject(err);
                });
            });
          })
          .catch((err) => {
            return res.status(500).json({ message: "Internal Server Error" });
          });
      }
    });

    averagePromise
      .then((average) => res.status(200).json({ average }))
      .catch((err) => {
        console.log(err);
        res.status(500).json({ message: "Internal Server Error" });
      });
  }
);

// router.post(
//   "/add",
//   AuthController.verify_token,
//   AuthController.is_authorized,
//   function (req, res) {
//     if (!ObjectId.isValid(req.body.personnelID))
//       return res.status(403).json({ message: "Invalid Personnel" });
//     personnel
//       .findOne({ _id: ObjectId(req.body.personnelID) })
//       .then((matchedPersonnel) => {
//         console.log(matchedPersonnel);
//         if (!matchedPersonnel)
//           return res.status(403).json({ message: "Unauthorized 1" });
//         else {
//           if (
//             req.decoded.priority < 3 ||
//             String(req.decoded.company) == String(matchedPersonnel.company)
//           ) {
//             let newHealthRep = new personnelHealth({
//               personnel: matchedPersonnel._id,
//               dateOfEntry: new Date().getTime(),
//               score: 10,
//             });
//             req.body.parameters.forEach((param, i) => {
//               if (!ObjectId.isValid(param.healthParameter))
//                 return res.status(403).json({ message: "Unauthorized 2" });
//               let currentParam = {};
//               currentParam.healthParameter = param.healthParameter;
//               if (typeof req.body.stage != "undefined")
//                 currentParam.stage = param.stage;
//               if (typeof req.body.value != "undefined")
//                 currentParam.value = param.value;
//               if (typeof req.body.presence != "undefined")
//                 currentParam.presence = param.presence;
//               newHealthRep.parameters.push(currentParam);
//             });
//             newHealthRep.save((err, result) => {
//               console.log(err);
//               if (err)
//                 return res
//                   .status(500)
//                   .json({ message: "Internal Server Error 1" });
//               matchedPersonnel.allEntries.push(result._id);
//               if (
//                 typeof req.body.followUpRequired != "undefined" &&
//                 typeof req.body.followUpRequired == "boolean"
//               )
//                 matchedPersonnel.followUpRequired = req.body.followUpRequired;
//               matchedPersonnel.save((err, _result) => {
//                 if (err)
//                   return res
//                     .status(500)
//                     .json({ message: "Internal Server Error 2" });
//                 return res
//                   .status(200)
//                   .json({ message: "Health Record Created" });
//               });
//             });
//           } else return res.status(403).json({ message: "Unauthorized 3" });
//         }
//       })
//       .catch((err) => {
//         return res.status(500).json({ message: "Internal Server Error 3" });
//       });
//   }
// );

router.post(
  "/compare",
  AuthController.verify_token,
  AuthController.is_authorized,
  async function (req, res) {
    try {
      const Personnel = await personnel.findOne({
        _id: ObjectId(req.body.personnelId),
      });
      if (!Personnel)
        return res.status(400).json({ message: "No Such Police Personnel" });
      if (
        req.decoded.priority < 2 ||
        req.decoded.company == personnel.company
      ) {
        const currentRecord = await personnelHealth.findOne({
          _id: ObjectId(Personnel.allEntries[Personnel.allEntries.length - 1]),
        });
        const prevRecord = await personnelHealth.findOne({
          _id: ObjectId(req.body.previousRecord),
        });
        let comparisonArr = new Array();
        for (const currParam of currentRecord.parameters) {
          for (const prevParam of prevRecord.parameters) {
            if (
              String(currParam.healthParameter) ==
              String(prevParam.healthParameter)
            ) {
              const HealthParameter = await healthParameter.findOne({
                _id: ObjectId(currParam.healthParameter),
              });
              ComparissonObj = {
                paramName: HealthParameter.name,
                PrevRec: {
                  value: prevParam.value,
                  stage: prevParam.stage,
                  presence: prevParam.presence,
                },
                CurrRec: {
                  value: currParam.value,
                  stage: currParam.stage,
                  presence: currParam.presence,
                },
                valueChange: currParam.value - prevParam.value,
              };
              comparisonArr.push(ComparissonObj);
            }
          }
        }
        let scoreChange = currentRecord.score - prevRecord.score;
        return res.status(200).json({
          Comparisons: comparisonArr,
          scoreChange,
        });
      } else {
        return res.status(403).json({ message: "Access Forbidden" });
      }
    } catch (err) {
      console.log(err);
      return res.status(500).json({
        message: "Internal Server Error",
        error: err,
      });
    }
  }
);

router.post(
  "/info/:id",
  AuthController.verify_token,
  AuthController.is_authorized,
  function (req, res) {
    personnel
      .findById(ObjectId(req.params.id))
      .then(async (entries) => {
        if (entries.allEntries.length < 1)
          return res.status(404).json({ message: "No Previous Entries Found" });
        
        let LatestEntry = entries.allEntries[entries.allEntries.length - 1];

        const allPersonnelHealth = await personnelHealth.find({personnel:ObjectId(req.params.id)});
        if(allPersonnelHealth.length > 6){
         allPersonnelHealth = allPersonnelHealth.slice(-6);
        }
        let weightArr = [];
        for(const entry of allPersonnelHealth){
          let WeightObj = {
            Month:entry.dateOfEntry.getMonth() + 1,
            Year:entry.dateOfEntry.getFullYear(),
            Weight:entry.weight
          }
          weightArr.push(WeightObj);
        }
        personnelHealth
          .findOne({ _id: ObjectId(LatestEntry) })
          .then( (lastEntry) => {
            lastEntry = lastEntry.toObject();
            var bmiVal = lastEntry.bmi;
            var weightCondition = ""
            if(bmiVal < 18.5) {
              weightCondition = "Underweight"
            }
            else if (bmiVal >= 25) {
              if(bmiVal >= 30) weightCondition = "Obese";
              else weightCondition = "Overweight";
            }
            else {
              weightCondition = "Normal"
            }

            lastEntry[`weightCondition`] = weightCondition;


            const previousEntries = entries.allEntries;
            return res.status(200).json({ lastEntry, previousEntries,weightArr });
          })
          .catch((err) => {
            return res.status(500).json({ message: "Internal Server Error" });
          });
      })
      .catch((err) => {
        return res.status(500).json({ message: "Internal Server Error" });
      });
  }
);

router.post(
  "/view",
  AuthController.verify_token,
  AuthController.is_authorized,
  function (req, res) {
    let average = 0;

    const averagePromise = new Promise((resolve, reject) => {
      if (req.decoded.priority == 3) {
        personnel
          .find({ company: ObjectId(req.decoded.company) })
          .then((personnels) => {
            personnels.forEach((person, i) => {
              personnelHealth
                .findOne({
                  _id: ObjectId(
                    person.allEntries[person.allEntries.length - 1]
                  ),
                })
                .then((matchedRecord) => {
                  average += matchedRecord.score;
                  if (i == personnels.length - 1) resolve(average / i);
                })
                .catch((err) => {
                  reject();
                });
            });
          })
          .catch((err) => {
            return res.status(500).json({ message: "Internal Server Error" });
          });
      } else {
        personnel
          .find()
          .then((personnels) => {
            personnels.forEach((person, i) => {
              personnelHealth
                .findOne({
                  _id: ObjectId(
                    person.allEntries[person.allEntries.length - 1]
                  ),
                })
                .then((matchedRecord) => {
                  average += matchedRecord.score;
                  if (i == personnels.length - 1) resolve(average / i);
                })
                .catch((err) => {
                  reject(err);
                });
            });
          })
          .catch((err) => {
            return res.status(500).json({ message: "Internal Server Error" });
          });
      }
    });

    averagePromise
      .then((average) => res.status(200).json({ average }))
      .catch((err) => {
        console.log(err);
        res.status(500).json({ message: "Internal Server Error" });
      });
  }
);

router.post(
  "/bmi",
  AuthController.verify_token,
  AuthController.is_authorized,
  function(req,res){

    let underweight = [];
    let normal = [];
    let overweight = [];
    let obese = [];
    async function getBMI(personnels){
      for(const person of personnels){
        await record.findOne({_id : ObjectId(person.allEntries[person.allEntries.length-1])}).then(matchedRecord => {
          if(matchedRecord !== null)
          {
            if(matchedRecord.bmi < 18.5) {
              underweight.push(person)
            }
            else if (matchedRecord.bmi >= 25) {
              if(matchedRecord.bmi >= 30) obese.push(person);
              else overweight.push(person);
            }
            else {
              normal.push(person)
            }
          }
 
        }).catch(err => {
          console.log(err);
        });
      }
    }
    
    // ADGP Admin will get BMI details of Entire DB
    if (req.decoded.priority == 1){
      new Promise((resolve,reject) => {
        personnel.find().then(async(personnels) => {
          await getBMI(personnels);
          resolve({underweight,normal,overweight,obese});
        }).catch(err => {
          reject(err);
        });
      }).then(result => {
        console.log(result)
        return res.status(200).json({result});
      })
      .catch(err => {
        return res.status(500).json({message: "Internal Server Error"});
      });
    }
    else if(req.decoded.priority == 2) {
      new Promise((resolve,reject) => {
        personnel.find({battalion:req.decoded.battalion}).then(async(personnels) => {
          await getBMI(personnels);
          resolve({underweight,normal,overweight,obese});
        }).catch(err => {
          reject(err);
        });
      }).then(result => {
        return res.status(200).json({result});
      })
      .catch(err => {
        return res.status(500).json({message: "Internal Server Error"});
      });
    }
    else {
      new Promise((resolve,reject) => {
        personnel.find({company:req.decoded.company}).then(async(personnels) => {
          await getBMI(personnels);
          resolve({underweight,normal,overweight,obese});
        }).catch(err => {
          reject(err);
        });
      }).then(result => {
        return res.status(200).json({result});
      })
      .catch(err => {
        return res.status(500).json({message: "Internal Server Error"});
      });
    }
});

router.post(
  "/addRecord",
  AuthController.verify_token,
  AuthController.is_authorized,
  function (req, res) {
    console.log(req.body);
    if (!ObjectId.isValid(req.body.personnelID))
      return res.status(403).json({ message: "Invalid Personnel" });
    personnel
      .findOne({ _id: ObjectId(req.body.personnelID) })
      .then((matchedPersonnel) => {
        if (!matchedPersonnel)
          return res.status(403).json({ message: "Unauthorized Personnel" });
        else {
          if (
            req.decoded.priority < 3 ||
            String(req.decoded.company) == String(matchedPersonnel.company)
          ) {

            personnelHealth.find({_id:matchedPersonnel._id}).then(records =>{
              records.forEach((record,i)=>{
                if(record.dateOfEntry.getMonth()==Date.getMonth()){
                  return res.status(403).json({message:"Record already added this month"});
                }
                else {
                  let newHealthRep = new personnelHealth({
                    personnel: matchedPersonnel._id,
                    parameters: [],
                    dateOfEntry: new Date().getTime(),
                    height: req.body.height,
                    weight: req.body.weight,
                    bmi:
                      Number(req.body.weight) /
                      ((Number(req.body.height)/100) * (Number(req.body.height)/100)),
                    score: 10,
                  });
                  
                  req.body.parameters.forEach((param, i) => {
                    if (!ObjectId.isValid(param.healthParameter))
                      return res.status(403).json({ message: "Unauthorized Param" });
                    let currentParam = {};
                    currentParam.healthParameter = param.healthParameter;
                    if (typeof param.stage != "undefined")
                      currentParam.stage = param.stage;
                    if (typeof param.value != "undefined")
                      currentParam.value = param.value;
                    if (typeof param.presence != "undefined")
                      currentParam.presence = param.presence;
                    newHealthRep.parameters.push(currentParam);
                  });
                  newHealthRep.save((err, result) => {
                    if (err)
                      return res
                        .status(500)
                        .json({ message: "Internal Server Error" });
                    matchedPersonnel.allEntries.push(result._id);
                    if (
                      typeof req.body.followUpRequired != "undefined" &&
                      typeof req.body.followUpRequired == "boolean"
                    )
                      matchedPersonnel.followUpRequired = req.body.followUpRequired;
                    matchedPersonnel.save((err, _result) => {
                      if (err)
                        return res
                          .status(500)
                          .json({ message: "Internal Server Error" });
                      return res
                        .status(200)
                        .json({ message: "Health Record Created" });
                    });
                  });
                }
              });
            }).catch(err => {
              return res.status(500).json({message : "Error fetching records"});
            });
            
          } else
            return res.status(403).json({ message: "Unauthorized Company" });
        }
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
      });
  }
);


router.post('/add',AuthController.verify_token,
AuthController.is_authorized,
async function (req, res){
  try{
    const matchedPersonnel = await personnel.findOne({ _id: ObjectId(req.body.personnelID)});
    if(!matchedPersonnel) return res.status(400).json({message: "Invalid Personnel"});
    if(req.decoded.priority < 3 ||  String(req.decoded.company) == String(matchedPersonnel.company)){
      if (!ObjectId.isValid(req.body.personnelID))
      return res.status(403).json({ message: "Invalid Personnel" });     
      const lastEntry = await personnelHealth.findOne({_id:ObjectId(matchedPersonnel.allEntries[matchedPersonnel.allEntries.length - 1])});
      if(lastEntry)
        if(lastEntry.dateOfEntry.getMonth() == new  Date().getMonth()){
          return res.status(400).json({message:"Entry already done for this month"});
        }
      if(!req.body.remarks) req.body.remarks = "";
      var bmiVal = parseFloat((Number(req.body.weight) / ((Number(req.body.height)/100) * (Number(req.body.height)/100))).toFixed(2));
      let newHealthRep = new personnelHealth({
        personnel: matchedPersonnel._id,
        parameters: [],
        dateOfEntry: new Date().getTime(),
        height: req.body.height,
        weight: req.body.weight,
        bmi:bmiVal,
        score: 10,
        remarks:req.body.remarks
      });
      let deduction = 0;
      if(typeof (req.body.parameters) != 'undefined')
      for(const param of req.body.parameters){
        if (!ObjectId.isValid(param.healthParameter))
        return res.status(403).json({ message: "Unauthorized Param" });
        let currentParam = {};
        currentParam.healthParameter = param.healthParameter;
        if (typeof param.stage != "undefined"){
          currentParam.stage = param.stage;
          const hparam = await healthParameter.findOne({_id:ObjectId(param.healthParameter)})
          for(const stg of hparam.stages){
            if(stg.name === param.stage){
              deduction += Math.abs(stg.score);
            }
          }
        }
        if (typeof param.value != "undefined")
          currentParam.value = param.value;
        if (typeof param.presence != "undefined")
          currentParam.presence = param.presence;
        newHealthRep.parameters.push(currentParam);
      }
      newHealthRep.score -= deduction;

      if(bmiVal < 18.5) {
        newHealthRep.score -= 1;
      }
      else if (bmiVal >= 25) {
        if(bmiVal >= 30) newHealthRep.score -= 2;
        else newHealthRep.score -= 1;;
      }

      if(newHealthRep.score < 0) newHealthRep.score = 0;
      await newHealthRep.save((err, result) => {
        if (err)
          return res
            .status(500)
            .json({ message: "Internal Server Error" });
        matchedPersonnel.allEntries.push(result._id);
        matchedPersonnel.lastEntry = new Date();
        if (
          typeof req.body.followUpRequired != "undefined" &&
          typeof req.body.followUpRequired == "boolean"
        )
        matchedPersonnel.followUpRequired = req.body.followUpRequired;
     
        matchedPersonnel.save((err, _result) => {
          if (err)
            return res
              .status(500)
              .json({ message: "Internal Server Error 1" });
          return res
            .status(200)
            .json({ message: "Health Record Created" });
        });
      });
    }
    else{
      return res.status(401).json({message:"Unauthorized"});
    }
  }catch(err){
    console.log(err);
    return res.status(500).json({message:"Internal Server Error2"});
  }
});

module.exports = router;
