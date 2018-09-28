var express = require('express')
var bodyParser = require('body-parser')
var cors = require('cors')
var mongo = require('mongodb')
var mongoose = require('mongoose')
var shortid = require('shortid')

var app = express()
app.use(cors())
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())
app.use(express.static('public'))

//Set up schema and model for users and exercises
mongoose.connect(process.env.MONGO_URI)
var userSchema = new mongoose.Schema({
  _id: {type:String, default:shortid.generate},
  username:String
});
var exerSchema = new mongoose.Schema({
  _id: {type:String, default:shortid.generate},
  user:userSchema,
  description:String,
  duration:Number,
  date:Date
});
var User = mongoose.model('User', userSchema);
var Exercise = mongoose.model('Exercise', exerSchema);

//Default GET
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//POST new user
app.post('/api/exercise/new-user', function(req, res){
  var document = new User({username:req.body.username});
  document.save(function(err,data){
    if (err)
      console.log('Error:',err);
    else
      res.json({id:data._id, username:data.username});
  });
});

//GET user list
app.get('/api/exercise/users', function(req, res){
  //return array of {_id, username} objects from DB query
  User.find({}, function(err, rows){
    if (err)
      console.log('Error:',err);
    else
      res.json(rows);
  });
});

//POST exercise to user
app.post('/api/exercise/add', (req, res)=>{
  var addID = req.body.userId;
  var addDesc = req.body.description;
  var addDur = req.body.duration;
  var addDate = new Date(req.body.date);
  User.findOne({_id:addID}, function(err,doc){
    if (err)
      console.log('Error:',err);
    else{
      var document = new Exercise({
        user:doc, 
        description:addDesc, 
        duration:addDur, 
        date:addDate
      });
      document.save(function(err,data){
        if (err)
          console.log('Error:',err);
        else
          res.json(data);
      });
    };
  });
});

//GET selected exercises
app.get('/api/exercise/log', (req, res)=>{
  //Find the user first, with param userId
  var logID = req.query.userId;
  var logFrom = new Date(req.query.from);
  var logTo = new Date(req.query.to);
  var logLimit = parseInt(req.query.limit);
  
  User.findOne({_id:logID}, function(err,doc){
    //Find exercises with the user, filtering with params to, from, and limit if present
    Exercise.find({user:doc, date:{$gt:logFrom, $lt:logTo}}).limit(logLimit).exec(function(err,rows){
      if (err)
        console.log('Error:',err);
      else
        res.json(rows);
    });
  });
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})