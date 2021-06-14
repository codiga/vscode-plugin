import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { getLanguageForFile } from '../../../utils/fileUtils';
import { Language } from '../../../graphql/types';
// import * as myExtension from '../../extension';

suite('fileUtils.ts test', () => {
	vscode.window.showInformationMessage('Start fileUtils tests.');

	test('Find the right language', () => {
		assert.strictEqual(getLanguageForFile('myfile.rb'), Language.Ruby);
        assert.strictEqual(getLanguageForFile('myfile.py'), Language.Python);
        assert.strictEqual(getLanguageForFile('myfile.py3'), Language.Python);
        assert.strictEqual(getLanguageForFile('myfile.scala'), Language.Scala);
        assert.strictEqual(getLanguageForFile('myfile.php'), Language.Php);
        assert.strictEqual(getLanguageForFile('myfile.php4'), Language.Php);
        assert.strictEqual(getLanguageForFile('myfile.php5'), Language.Php);
        assert.strictEqual(getLanguageForFile('myfile.sh'), Language.Shell);
        assert.strictEqual(getLanguageForFile('myfile.bash'), Language.Shell);
        assert.strictEqual(getLanguageForFile('myfile.c'), Language.C);
        assert.strictEqual(getLanguageForFile('myfile.cpp'), Language.Cpp);
        assert.strictEqual(getLanguageForFile('myfile.dart'), Language.Dart);
        assert.strictEqual(getLanguageForFile('myfile.cls'), Language.Apex);
        assert.strictEqual(getLanguageForFile('myfile.tf'), Language.Terraform);
        assert.strictEqual(getLanguageForFile('myfile.ts'), Language.Typescript);
        assert.strictEqual(getLanguageForFile('myfile.yaml'), Language.Yaml);
        assert.strictEqual(getLanguageForFile('myfile.yml'), Language.Yaml);
        assert.strictEqual(getLanguageForFile('myfile.java'), Language.Java);
        assert.strictEqual(getLanguageForFile('myfile.js'), Language.Javascript);
        assert.strictEqual(getLanguageForFile('myfile.jsx'), Language.Javascript);
        assert.strictEqual(getLanguageForFile('myfile.go'), Language.Go);
        assert.strictEqual(getLanguageForFile('myfile.rs'), Language.Rust);
        assert.strictEqual(getLanguageForFile('Dockerfile'), Language.Docker);
        assert.strictEqual(getLanguageForFile('Dockerfile.pouet'), Language.Docker);
	});
});
