const yup = require("yup");
const responseHandler = require('../utils/responseHandler');

exports.validate = (schema) => {
  return async (req, res, next) => {
    try {
      // If schema is already a Yup object (new structure)
      if (schema instanceof yup.ObjectSchema) {
        await schema.validate({
          body: req.body,
          query: req.query,
          params: req.params,
        });
      } 
      // If schema has separate params, query, body properties (old structure)
      else if (schema.params || schema.query || schema.body) {
        if (schema.params) {
          await schema.params.validate(req.params);
        }
        if (schema.query) {
          await schema.query.validate(req.query);
        }
        if (schema.body) {
          await schema.body.validate(req.body);
        }
      } 
      // If it's a single schema for body only
      else {
        await schema.validate(req.body);
      }
      
      next();
    } catch (err) {
      return responseHandler.sendBadRequestResponse(res, { type: err.name, message: err.message });
    }
  };
};