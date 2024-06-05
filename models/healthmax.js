const mongoose=require('mongoose');
const Schema=mongoose.Schema;
const Info = require('./infor');
const healthmaxSchema=new Schema({
    Name:String,
    Age:Number,
    Height:Number,
    Weight:Number,
    
    image1:[{
        url:String,
        filename:String
    }],
    image2:[{
        url:String,
        filename:String
    }],
    image3:[{
        url:String,
        filename:String
    }]
   ,
    author: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    info:[{
        type: Schema.Types.ObjectId,
        ref:'Info'
    }]
    
},{
    strictPopulate: false
});
healthmaxSchema.post('findOneAndDelete', async function (doc) {
    if (doc) {
        await Info.deleteMany({
            _id: {
                $in: doc.info
            }
        })
    }
})
module.exports=mongoose.model('healthmax',healthmaxSchema);