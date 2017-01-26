const model = function(data, fields){
  this.fields = fields;
  this.data = {};
  for(var key in this.fields){
    this.data[key] = data[key];
  }
};

model.prototype.validate = function(){
  for(var key in this.fields){
    if(this.fields[key].validate){
      var isValid = this.fields[key].validate(data[field]);
      if(!isValid){
        throw new Error(`${key} field faild validation`);
      }
    }
  }
};

model.prototype.sanitize = function(){
  var sanitizedFields = {};
  for(var key in this.fields){
    if(this.fields[key].public){
      sanitizedFields[key] = this.data[key];
    }
  }
  return sanitizedFields;
};

module.exports = model;