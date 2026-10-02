const pluginName =
  /^(?:@capacitor\/(?!core(?:\/|$)|cli(?:\/|$))|@capacitor-community\/|@capawesome(?:-team)?\/|@capgo\/|@microbit\/capacitor-)/;

export default {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      boundary:
        'Import Capacitor plugins only from src/platform/android/ or src/infrastructure/db/android/.',
    },
  },
  create(context) {
    function check(source) {
      const name =
        source?.type === 'TemplateLiteral' && source.expressions.length === 0
          ? source.quasis[0]?.value.cooked
          : source?.value;
      if (typeof name === 'string' && pluginName.test(name)) {
        context.report({ node: source, messageId: 'boundary' });
      }
    }
    return {
      ImportDeclaration: (node) => check(node.source),
      ExportNamedDeclaration: (node) => check(node.source),
      ExportAllDeclaration: (node) => check(node.source),
      ImportExpression: (node) => check(node.source),
      CallExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'require')
          check(node.arguments[0]);
      },
      TSImportEqualsDeclaration(node) {
        if (node.moduleReference.type === 'TSExternalModuleReference')
          check(node.moduleReference.expression);
      },
    };
  },
};
