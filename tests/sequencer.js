const TestSequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends TestSequencer {
  sort(tests) {
    // Ordenar testes por prioridade
    const testOrder = [
      'api.test.js',                    // Testes básicos primeiro
      'distributed-communication.test.js' // Testes distribuídos por último
    ];
    
    return tests.sort((testA, testB) => {
      const testAName = testA.path.split('/').pop();
      const testBName = testB.path.split('/').pop();
      
      const indexA = testOrder.indexOf(testAName);
      const indexB = testOrder.indexOf(testBName);
      
      if (indexA === -1 && indexB === -1) {
        return 0;
      }
      
      if (indexA === -1) {
        return 1;
      }
      
      if (indexB === -1) {
        return -1;
      }
      
      return indexA - indexB;
    });
  }
}

module.exports = CustomSequencer;
