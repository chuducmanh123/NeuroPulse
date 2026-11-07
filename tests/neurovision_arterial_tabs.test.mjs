import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

describe('NeuroVision Arterial Territories Integration', () => {
  const ontologyPath = path.resolve('public/neurovision/data/neuro_ontology.json');
  const toolbarPath = path.resolve('src/components/neurovision/ViewerToolbar.tsx');

  test('ViewerToolbar should have "Lãnh thổ chi phối động mạch" and not "Chi phối động mạch tổng quát"', () => {
    const toolbar = fs.readFileSync(toolbarPath, 'utf8');
    assert.ok(
      toolbar.includes('{ id: "arterial", label: "Lãnh thổ chi phối động mạch" }'),
      'Should rename arterial tab to "Lãnh thổ chi phối động mạch"'
    );
    assert.ok(
      !toolbar.includes('Chi phối động mạch tổng quát'),
      'Should not contain "Chi phối động mạch tổng quát"'
    );
    assert.ok(
      !toolbar.includes('arterial_level2'),
      'Should not contain arterial_level2 in toolbar overlays'
    );
  });

  test('All 32 arterial entries in ontology must have complete clinical, arterial, venous, and functional data', () => {
    const onto = JSON.parse(fs.readFileSync(ontologyPath, 'utf8'));
    const artEntries = onto.entries.filter((e) => e.atlas === 'arterial');
    assert.strictEqual(artEntries.length, 32, 'Must have exactly 32 arterial entries');

    artEntries.forEach((entry) => {
      assert.ok(entry.functions && entry.functions.length > 0, `Entry ${entry.code} must have functions`);
      assert.ok(
        entry.arterial_supply &&
        (entry.arterial_supply.primary.length > 0 || entry.arterial_supply.perforators.length > 0),
        `Entry ${entry.code} must have arterial supply`
      );
      assert.ok(
        entry.venous_drainage && entry.venous_drainage.length > 0,
        `Entry ${entry.code} must have venous drainage`
      );
      assert.ok(
        entry.clinical_syndromes && entry.clinical_syndromes.length > 0,
        `Entry ${entry.code} must have clinical syndromes`
      );
      entry.clinical_syndromes.forEach((syn) => {
        assert.ok(syn.name, `Syndrome in ${entry.code} must have a name`);
        assert.ok(syn.description, `Syndrome in ${entry.code} must have a description`);
      });
      assert.strictEqual(entry.evidence_level, 'approximate', `Entry ${entry.code} evidence_level should be approximate`);
    });
  });

  test('Venous drainage in arterial entries should reflect estimated venous territories', () => {
    const onto = JSON.parse(fs.readFileSync(ontologyPath, 'utf8'));
    const acal = onto.entries.find((e) => e.atlas === 'arterial' && e.code === 'ACAL');
    assert.ok(
      acal.venous_drainage.some((v) => v.includes('Xoang dọc trên')),
      'ACAL should drain into Superior Sagittal Sinus'
    );

    const llsl = onto.entries.find((e) => e.atlas === 'arterial' && e.code === 'LLSL');
    assert.ok(
      llsl.venous_drainage.some((v) => v.includes('Tĩnh mạch não trong') || v.includes('Xoang thẳng')),
      'LLSL should drain into deep venous system / straight sinus'
    );

    const icl = onto.entries.find((e) => e.atlas === 'arterial' && e.code === 'ICL');
    assert.ok(
      icl.venous_drainage.some((v) => v.includes('Xoang ngang') || v.includes('Xoang sigma') || v.includes('Tĩnh mạch tiểu não dưới')),
      'ICL should drain into infratentorial sinuses'
    );
  });
});
