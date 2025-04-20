const { Web3 } = require('web3');
const web3 = new Web3();

const tokenURI = "data:application/json;base64,eyJuYW1lIjoiRG9uJ3QgS2lsbCB0aGUgSmFtOiBUaGUgTm9pc2UgUG9saWNlIE5laWdoYm9yIiwiZGVzY3JpcHRpb24iOiJZb3VyIHVwdGlnaHQgbmVpZ2hib3Igd2l0aCBhIGRlY2liZWwgbWV0ZXIgYW5kIGEgdmVuZGV0dGEgYWdhaW5zdCBmdW4uIiwiaW1hZ2UiOiJodHRwczovL2JhZnliZWlha3ZlbW5qaGdia2tuYjRsdWdlN2theW95c2xua21ncWN3N3h3YW9xbXI1bDZ1am5hbHVtLmlwZnMuZHdlYi5saW5rP2ZpbGVuYW1lPWRrdGpuZnQxLmdpZiIsImF0dHJpYnV0ZXMiOlt7InRyYWl0X3R5cGUiOiJKYW0gS2lsbGVyIiwidmFsdWUiOiJUaGUgTm9pc2UgUG9saWNlIE5laWdoYm9yIn0seyJ0cmFpdF90eXBlIjoiTW9qbyBTY29yZSIsInZhbHVlIjoiODgifSx7InRyYWl0X3R5cGUiOiJOYXJyYXRpdmUiLCJ2YWx1ZSI6IkNhbm9lIn1dfQ==";

// Function signature for mint(address,string,uint256,string)
const functionSignature = web3.eth.abi.encodeFunctionSignature('mint(address,string,uint256,string)');
console.log('Function signature:', functionSignature);

const data = web3.eth.abi.encodeFunctionCall({
    name: 'mint',
    type: 'function',
    inputs: [{
        type: 'address',
        name: 'to'
    }, {
        type: 'string',
        name: 'tokenURI'
    }, {
        type: 'uint256',
        name: 'mojo'
    }, {
        type: 'string',
        name: 'narr'
    }]
}, ['0x742d35Cc6634C0532925a3b844Bc454e4438f44e', tokenURI, '88', 'Canoe']);

console.log('Encoded transaction data:', data); 