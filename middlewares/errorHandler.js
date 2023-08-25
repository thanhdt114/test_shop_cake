module.exports = async(err, req, res, next) => {
    // if(err.code) {
    //     console.log(err.stack);
    // }
    console.log(err.stack);
    res.json({
        success: false,
        errorCode: err.code,
        errorName: err.name,
        errorMessage: err.message
    })
  }