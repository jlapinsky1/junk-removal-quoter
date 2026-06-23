import React, { useState } from 'react';
import { calculateQuote } from '../utils/pricing';
import { calculateAllDistances } from '../utils/distance';
import { saveQuote } from '../utils/storage';
import InternalQuoteView from '../components/InternalQuoteView';
import CustomerQuoteView from '../components/CustomerQuoteView';

const LOAD_SIZES = [
  'Minimum pickup',
  'Small job',
  'Quarter truck/trailer',
  'Half truck/trailer',
  'Three-quarter truck/trailer',
  'Full truck/trailer',
  'Oversized / custom',
];

const DIFFICULTIES = [
  'Easy curbside',
  'Normal',
  'Stairs / inside removal',
  'Heavy items',
  'Dirty / messy / loose debris',
  'Construction debris',
];

const ADD_ONS = [
  'Stairs',
  'Heavy item',
  'Appliance',
  'Mattress',
  'Same-day / urgent',
  'Extra labor needed',
  'Long carry',
  'Donation/recycling stop',
];

const emptyForm = {
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  jobAddress: '',
  homeBaseToJob: '',
  jobToLandfill: '',
  landfillToHomeBase: '',
  distanceSource: 'manual',
  loadSize: 'Half truck/trailer',
  customBasePrice: '',
  numberOfDumpLoads: 1,
  estimatedJobTime: '',
  difficulty: 'Normal',
  addOns: [],
  notes: '',
};

export default function QuoteForm({ settings, initialData }) {
  const [formData, setFormData] = useState(initialData || emptyForm);
  const [quoteResult, setQuoteResult] = useState(null);
  const [showCustomerView, setShowCustomerView] = useState(false);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [distanceError, setDistanceError] = useState('');

  function updateField(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }));
    setQuoteResult(null);
  }

  function toggleAddOn(addon) {
    setFormData(prev => ({
      ...prev,
      addOns: prev.addOns.includes(addon)
        ? prev.addOns.filter(a => a !== addon)
        : [...prev.addOns, addon],
    }));
    setQuoteResult(null);
  }

  async function handleCalculateDistances() {
    if (!formData.jobAddress.trim()) {
      setDistanceError('Enter a job address first');
      return;
    }
    if (!settings.homeBaseAddress?.trim()) {
      setDistanceError('Set your home base address in Settings first');
      return;
    }
    setDistanceLoading(true);
    setDistanceError('');

    const result = await calculateAllDistances(
      settings.homeBaseAddress,
      formData.jobAddress,
      settings.landfillAddress
    );

    if (result.success) {
      setFormData(prev => ({
        ...prev,
        homeBaseToJob: result.homeBaseToJob,
        jobToLandfill: result.jobToLandfill,
        landfillToHomeBase: result.landfillToHomeBase,
        distanceSource: 'api',
      }));
      setDistanceError('');
    } else {
      setDistanceError(result.error);
      setFormData(prev => ({ ...prev, distanceSource: 'manual' }));
    }
    setDistanceLoading(false);
  }

  function handleCalculateQuote() {
    const result = calculateQuote(formData, settings);
    setQuoteResult(result);
  }

  function handleSave() {
    if (!quoteResult) return;
    saveQuote({
      ...formData,
      suggestedQuote: quoteResult.suggestedQuote,
      estimatedMargin: quoteResult.estimatedMargin,
      profitabilityStatus: quoteResult.profitabilityStatus,
    });
    alert('Quote saved!');
  }

  function handleReset() {
    setFormData(emptyForm);
    setQuoteResult(null);
    setDistanceError('');
  }

  const hasApiKey = !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  return (
    <div className="space-y-4 pb-8">
      {/* Customer Info */}
      <Card title="Customer Info">
        <Input label="Customer Name" value={formData.customerName} onChange={v => updateField('customerName', v)} />
        <Input label="Phone" type="tel" value={formData.customerPhone} onChange={v => updateField('customerPhone', v)} />
        <Input label="Email" type="email" value={formData.customerEmail} onChange={v => updateField('customerEmail', v)} />
      </Card>

      {/* Job Details */}
      <Card title="Job Details">
        <Input label="Job Address" value={formData.jobAddress} onChange={v => updateField('jobAddress', v)} />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Route Distances (miles)
              <span className="ml-2 text-xs text-gray-400">
                {formData.distanceSource === 'api' ? '(API calculated)' : '(manual entry)'}
              </span>
            </label>
            {hasApiKey && (
              <button
                onClick={handleCalculateDistances}
                disabled={distanceLoading}
                className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
              >
                {distanceLoading ? 'Calculating...' : 'Auto-Calculate All'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-500">Home to Job</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="w-full border rounded-lg px-2 py-2 text-sm"
                value={formData.homeBaseToJob}
                onChange={e => {
                  updateField('homeBaseToJob', e.target.value);
                  setFormData(prev => ({ ...prev, distanceSource: 'manual' }));
                }}
                placeholder="mi"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Job to Landfill</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="w-full border rounded-lg px-2 py-2 text-sm"
                value={formData.jobToLandfill}
                onChange={e => {
                  updateField('jobToLandfill', e.target.value);
                  setFormData(prev => ({ ...prev, distanceSource: 'manual' }));
                }}
                placeholder="mi"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Landfill to Home</label>
              <input
                type="number"
                step="0.1"
                min="0"
                className="w-full border rounded-lg px-2 py-2 text-sm"
                value={formData.landfillToHomeBase}
                onChange={e => {
                  updateField('landfillToHomeBase', e.target.value);
                  setFormData(prev => ({ ...prev, distanceSource: 'manual' }));
                }}
                placeholder="mi"
              />
            </div>
          </div>

          {distanceError && <p className="text-red-500 text-xs">{distanceError}</p>}
          {!hasApiKey && (
            <p className="text-gray-400 text-xs">No Google Maps API key configured. Enter distances manually.</p>
          )}
          {hasApiKey && !settings.homeBaseAddress && (
            <p className="text-amber-500 text-xs">Set your home base address in Settings to enable auto-calculation.</p>
          )}
        </div>

        <Select
          label="Load Size"
          value={formData.loadSize}
          options={LOAD_SIZES}
          onChange={v => updateField('loadSize', v)}
        />

        {formData.loadSize === 'Oversized / custom' && (
          <Input
            label="Custom Base Price ($)"
            type="number"
            value={formData.customBasePrice}
            onChange={v => updateField('customBasePrice', v)}
          />
        )}

        <Input
          label="Number of Dump Loads"
          type="number"
          min="1"
          value={formData.numberOfDumpLoads}
          onChange={v => updateField('numberOfDumpLoads', v)}
        />

        <Input
          label="Estimated Job Time (hours)"
          type="number"
          step="0.5"
          min="0"
          value={formData.estimatedJobTime}
          onChange={v => updateField('estimatedJobTime', v)}
        />

        <Select
          label="Difficulty"
          value={formData.difficulty}
          options={DIFFICULTIES}
          onChange={v => updateField('difficulty', v)}
        />
      </Card>

      {/* Add-Ons */}
      <Card title="Add-Ons">
        <div className="grid grid-cols-2 gap-2">
          {ADD_ONS.map(addon => (
            <label
              key={addon}
              className={`flex items-center gap-2 p-2 rounded-lg border text-sm cursor-pointer ${
                formData.addOns.includes(addon)
                  ? 'bg-blue-50 border-blue-400'
                  : 'bg-white border-gray-200'
              }`}
            >
              <input
                type="checkbox"
                checked={formData.addOns.includes(addon)}
                onChange={() => toggleAddOn(addon)}
                className="rounded"
              />
              <span>{addon}</span>
              <span className="text-gray-400 text-xs ml-auto">+${settings.addOnPrices[addon]}</span>
            </label>
          ))}
        </div>
      </Card>

      {/* Notes */}
      <Card title="Notes">
        <textarea
          className="w-full border rounded-lg px-3 py-2 text-sm"
          rows={3}
          value={formData.notes}
          onChange={e => updateField('notes', e.target.value)}
          placeholder="Additional notes about the job..."
        />
      </Card>

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={handleCalculateQuote}
          className="w-full bg-green-600 text-white py-4 rounded-xl text-lg font-bold shadow-lg active:bg-green-700"
        >
          Calculate Quote
        </button>

        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium text-sm"
          >
            Clear Form
          </button>
        </div>
      </div>

      {/* Quote Result */}
      {quoteResult && (
        <>
          <InternalQuoteView formData={formData} quoteResult={quoteResult} />

          <div className="space-y-2">
            <button
              onClick={() => setShowCustomerView(true)}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold"
            >
              View Customer Quote
            </button>
            <button
              onClick={handleSave}
              className="w-full bg-gray-800 text-white py-3 rounded-xl font-bold"
            >
              Save Quote
            </button>
          </div>
        </>
      )}

      {showCustomerView && quoteResult && (
        <CustomerQuoteView
          formData={formData}
          quoteResult={quoteResult}
          onClose={() => setShowCustomerView(false)}
        />
      )}
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

function Input({ label, type = 'text', value, onChange, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        className="w-full border rounded-lg px-3 py-2 text-sm"
        value={value}
        onChange={e => onChange(e.target.value)}
        {...props}
      />
    </div>
  );
}

function Select({ label, value, options, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
