const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const pricingModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('constants/pricing.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { module: pricingModule, exports: pricingModule.exports });
function renderBilling(plan) {
  const module = { exports: {} };
  const Container = ({ children }) => React.createElement('div', null, children);
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/settings/BillingTab.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, {
    module, exports: module.exports,
    require(id) {
      if (id === 'react' || id === 'react/jsx-runtime') return require(id);
      if (id === 'next/link') return { __esModule: true, default: Container };
      if (id === '@/constants/pricing') return pricingModule.exports;
      if (id === '@/lib/ai/schema') return { AI_LIMITS: { [plan]: { generations: plan === 'FREE' ? 1 : 200 } } };
      if (id === '@/lib/plans') return { COURSE_LIMITS: { [plan]: plan === 'FREE' ? 3 : 'Unlimited' } };
      if (id === 'sonner') return { toast: {} };
      if (id.startsWith('@/components/ui/') || id === 'lucide-react') return new Proxy({}, { get: () => Container });
      throw new Error(id);
    },
  });
  return renderToStaticMarkup(React.createElement(module.exports.default, {
    plan, canManageBilling: plan !== 'FREE', subscriptionStatus: plan === 'FREE' ? null : 'active', renewsOn: null,
  }));
}
test('internal Professional accounts show a generic paid plan and billing action', () => {
  const html = renderBilling('PROFESSIONAL');
  assert.match(html, /Paid plan/);
  assert.match(html, /See billing portal/);
  assert.match(html, /Manage billing/);
  assert.doesNotMatch(html, /Professional|Custom|\$12/);
});
test('billing shows the account plan and delegates subscription-specific prices to the portal', () => {
  assert.match(renderBilling('FREE'), /Free plan/);
  assert.match(renderBilling('CREATOR'), /Creator plan/);
  assert.match(renderBilling('CREATOR'), /See billing portal/);
  assert.doesNotMatch(renderBilling('CREATOR'), /\$12|\$15/);
});
test('free billing price and period follow the shared pricing configuration', () => {
  const pricing = pricingModule.exports.PLAN_PRICING;
  const original = { amount: pricing.plans.FREE.amount, period: pricing.billingPeriod };
  try {
    pricing.plans.FREE.amount = 3;
    pricing.billingPeriod = 'year';
    const html = renderBilling('FREE');
    assert.match(html, /\$3/);
    assert.match(html, /\/ year/);
  } finally {
    pricing.plans.FREE.amount = original.amount;
    pricing.billingPeriod = original.period;
  }
});
