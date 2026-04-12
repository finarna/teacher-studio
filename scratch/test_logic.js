
const path = require('path');
const fs = require('fs');

async function testOfficialLogic(subject) {
  const subjectLower = subject?.toLowerCase();
  const isMath = subjectLower === 'mathematics' || subjectLower === 'math';
  const isPhysics = subjectLower === 'physics';
  
  console.log(`Input Subject: ${subject}`);
  console.log(`isMath: ${isMath}, isPhysics: ${isPhysics}`);

  if (isMath || isPhysics) {
    const flagshipSets = isMath 
      ? [
          { id: 'SET-A', file: 'flagship_final.json', label: 'Mathematics SET-A' },
          { id: 'SET-B', file: 'flagship_final_b.json', label: 'Mathematics SET-B' }
        ]
      : [
          { id: 'SET-A', file: 'flagship_physics_final.json', label: 'Physics SET-A' },
          { id: 'SET-B', file: 'flagship_physics_final_b.json', label: 'Physics SET-B' }
        ];
    
    console.log('Selected Sets:', flagshipSets);
  }
}

testOfficialLogic('Physics');
testOfficialLogic('physics');
testOfficialLogic('mathematics');
