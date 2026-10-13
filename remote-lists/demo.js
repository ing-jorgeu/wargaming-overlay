// Explicit offline fixture, not an LLM or a rules validator.
const {cleanList}=require('./importer');
async function demoImporter(){return cleanList({name:'Ejemplo de revisión',units:[{name:'Rubric Marines',enhancement:'',characters:[],notes:'4× warpflamer; icon of flame'},{name:'Chaos Rhino',enhancement:'',characters:[],notes:'Havoc launcher'}],warnings:['MODO DEMO: respuesta predefinida para probar la interfaz. No se consultaron OpenAI ni fichas reales.']});}
module.exports={demoImporter};
