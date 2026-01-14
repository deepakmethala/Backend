

const asyncHandler = function(requestHandler){
      return async function(req,res,next){
            Promise.resolve(requestHandler(req,res,next)).catch((err) => next(err))
      }
}

export default asyncHandler