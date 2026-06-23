import React, { useState } from 'react';
import { saveSettings, DEFAULT_SETTINGS } from '../utils/storage';

export default function Settings({ settings, onSettingsChange }) {
  const [local, setLocal] = useState(settings);
  const [saved, setSaved] = useState(false);

  function update(field, value) {
    setLocal(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  function updateBasePrice(loadSize, field, value) {
    setLocal(prev => ({
      ...prev,
      basePrices: {
        ...prev.basePrices,
        [loadSize]: {
          ...prev.basePrices[loadSize],
          [field]: Number(value),
        },
      },
    }));
    setSaved(false);
  }

  function updateAddOnPrice(addon, value) {
    setLocal(prev => ({
      ...prev,
      addOnPrices: {
        ...prev.addOnPrices,
        [addon]: Number(value),
      },
    }));
    setSaved(false);
  }

  function updateAccessModifier(accessType, value) {
    setLocal(prev => ({
      ...prev,
      accessModifiers: {
        ...prev.accessModifiers,
        [accessType]: Number(value),
      },
    }));
    setSaved(false);
  }

  function updateSensitivity(field, value) {
    setLocal(prev => ({
      ...prev,
      priceSensitivity: {
        ...prev.priceSensitivity,
        [field]: Number(value),
      },
    }));
    setSaved(false);
  }

  function updateDistanceSurcharge(index, value) {
    setLocal(prev => {
      const tiers = [...prev.distanceSurcharges];
      tiers[index] = { ...tiers[index], surcharge: Number(value) };
      return { ...prev, distanceSurcharges: tiers };
    });
    setSaved(false);
  }

  function handleSave() {
    saveSettings(local);
    onSettingsChange(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    if (!confirm('Reset all settings to defaults?')) return;
    setLocal(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    onSettingsChange(DEFAULT_SETTINGS);
    setSaved(true);
  }

  return (
    <div className="space-y-4 pb-8">
      <Card title="General">
        <Field label="Home Base Address">
          <input
            type="text"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={local.homeBaseAddress}
            onChange={e => update('homeBaseAddress', e.target.value)}
            placeholder="Your starting address"
          />
        </Field>
        <Field label="Landfill Address">
          <input
            type="text"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={local.landfillAddress}
            onChange={e => update('landfillAddress', e.target.value)}
          />
        </Field>
        <Field label="Truck MPG">
          <input
            type="number"
            step="0.5"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={local.mpg}
            onChange={e => update('mpg', Number(e.target.value))}
          />
        </Field>
        <Field label="Gas Price ($/gallon)">
          <input
            type="number"
            step="0.05"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={local.gasPrice}
            onChange={e => update('gasPrice', Number(e.target.value))}
          />
        </Field>
        <Field label="Dump Fee ($/load)">
          <input
            type="number"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={local.dumpFee}
            onChange={e => update('dumpFee', Number(e.target.value))}
          />
        </Field>
        <Field label="Minimum Quote Price ($)">
          <input
            type="number"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={local.minimumPrice}
            onChange={e => update('minimumPrice', Number(e.target.value))}
          />
        </Field>
      </Card>

      <Card title="Base Prices">
        {Object.entries(local.basePrices).map(([size, prices]) => (
          <div key={size} className="border-b pb-2 last:border-b-0">
            <div className="text-sm font-medium text-gray-700 mb-1">{size}</div>
            {size !== 'Oversized / custom' ? (
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-400">Min</label>
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={prices.min}
                    onChange={e => updateBasePrice(size, 'min', e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-400">Default</label>
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={prices.default}
                    onChange={e => updateBasePrice(size, 'default', e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-400">Max</label>
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={prices.max}
                    onChange={e => updateBasePrice(size, 'max', e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">User-entered at quote time</p>
            )}
          </div>
        ))}
      </Card>

      <Card title="Add-On Prices">
        {Object.entries(local.addOnPrices).map(([addon, price]) => (
          <div key={addon} className="flex items-center justify-between gap-2">
            <span className="text-sm text-gray-700">{addon}</span>
            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-sm">$</span>
              <input
                type="number"
                className="w-20 border rounded px-2 py-1 text-sm text-right"
                value={price}
                onChange={e => updateAddOnPrice(addon, e.target.value)}
              />
            </div>
          </div>
        ))}
      </Card>

      <Card title="Access Modifiers">
        {Object.entries(local.accessModifiers).map(([accessType, price]) => (
          <div key={accessType} className="flex items-center justify-between gap-2">
            <span className="text-sm text-gray-700">{accessType}</span>
            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-sm">$</span>
              <input
                type="number"
                className="w-20 border rounded px-2 py-1 text-sm text-right"
                value={price}
                onChange={e => updateAccessModifier(accessType, e.target.value)}
              />
            </div>
          </div>
        ))}
      </Card>

      <Card title="Price Sensitivity Adjustments">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-gray-700">Win the Job discount (easy curbside)</span>
            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-sm">$</span>
              <input
                type="number"
                className="w-20 border rounded px-2 py-1 text-sm text-right"
                value={local.priceSensitivity.winTheJobDiscount}
                onChange={e => updateSensitivity('winTheJobDiscount', e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-gray-700">Protect Margin add (small jobs)</span>
            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-sm">$</span>
              <input
                type="number"
                className="w-20 border rounded px-2 py-1 text-sm text-right"
                value={local.priceSensitivity.protectMarginSmall}
                onChange={e => updateSensitivity('protectMarginSmall', e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-gray-700">Protect Margin add (medium/full)</span>
            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-sm">$</span>
              <input
                type="number"
                className="w-20 border rounded px-2 py-1 text-sm text-right"
                value={local.priceSensitivity.protectMarginLarge}
                onChange={e => updateSensitivity('protectMarginLarge', e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card title="Distance Surcharges">
        {local.distanceSurcharges.map((tier, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <span className="text-sm text-gray-700">
              {tier.min === 0 ? '0' : `>${tier.min - 0.1}`}–{tier.max === Infinity ? '40+' : tier.max} mi
            </span>
            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-sm">$</span>
              <input
                type="number"
                className="w-20 border rounded px-2 py-1 text-sm text-right"
                value={tier.surcharge}
                onChange={e => updateDistanceSurcharge(i, e.target.value)}
              />
            </div>
          </div>
        ))}
      </Card>

      <div className="space-y-2">
        <button
          onClick={handleSave}
          className={`w-full py-3 rounded-xl font-bold text-white ${saved ? 'bg-green-500' : 'bg-blue-600'}`}
        >
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
        <button
          onClick={handleReset}
          className="w-full py-3 rounded-xl font-medium text-gray-600 bg-gray-200"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <h2 className="font-bold text-gray-800">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
