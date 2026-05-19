import { useState, useEffect } from 'react';
import { CreditCard, Wallet, Bitcoin, Eye, EyeOff, Check, AlertCircle, Loader2, TestTube, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { usePaymentGatewaySettings, GatewayType, GatewayFormData } from '@/hooks/usePaymentGatewaySettings';

interface GatewayConfig {
  type: GatewayType;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  fields: {
    test: { key: string; label: string; placeholder: string; isSecret?: boolean }[];
    live: { key: string; label: string; placeholder: string; isSecret?: boolean }[];
  };
}

const GATEWAY_CONFIGS: GatewayConfig[] = [
  {
    type: 'stripe',
    name: 'Stripe',
    description: 'Accept credit cards, Apple Pay, Google Pay and more',
    icon: CreditCard,
    color: 'bg-[#635BFF]/10 text-[#635BFF]',
    fields: {
      test: [
        { key: 'test_api_key', label: 'Publishable Key', placeholder: 'pk_test_...' },
        { key: 'test_secret_key', label: 'Secret Key', placeholder: 'sk_test_...', isSecret: true },
        { key: 'test_webhook_secret', label: 'Webhook Secret', placeholder: 'whsec_...', isSecret: true },
      ],
      live: [
        { key: 'live_api_key', label: 'Publishable Key', placeholder: 'pk_live_...' },
        { key: 'live_secret_key', label: 'Secret Key', placeholder: 'sk_live_...', isSecret: true },
        { key: 'live_webhook_secret', label: 'Webhook Secret', placeholder: 'whsec_...', isSecret: true },
      ],
    },
  },
  {
    type: 'paypal',
    name: 'PayPal',
    description: 'Accept PayPal payments and Pay Later options',
    icon: Wallet,
    color: 'bg-[#003087]/10 text-[#003087]',
    fields: {
      test: [
        { key: 'test_api_key', label: 'Client ID', placeholder: 'sandbox-client-id...' },
        { key: 'test_secret_key', label: 'Client Secret', placeholder: 'sandbox-secret...', isSecret: true },
      ],
      live: [
        { key: 'live_api_key', label: 'Client ID', placeholder: 'live-client-id...' },
        { key: 'live_secret_key', label: 'Client Secret', placeholder: 'live-secret...', isSecret: true },
      ],
    },
  },
  {
    type: 'crypto',
    name: 'Cryptocurrency',
    description: 'Accept Bitcoin, Ethereum and other cryptocurrencies via Coinbase Commerce',
    icon: Bitcoin,
    color: 'bg-[#F7931A]/10 text-[#F7931A]',
    fields: {
      test: [
        { key: 'test_api_key', label: 'API Key', placeholder: 'sandbox-api-key...' },
        { key: 'test_webhook_secret', label: 'Webhook Shared Secret', placeholder: 'webhook-secret...', isSecret: true },
      ],
      live: [
        { key: 'live_api_key', label: 'API Key', placeholder: 'api-key...' },
        { key: 'live_webhook_secret', label: 'Webhook Shared Secret', placeholder: 'webhook-secret...', isSecret: true },
      ],
    },
  },
];

interface GatewayCardProps {
  config: GatewayConfig;
  isDisabled?: boolean;
}

function GatewayCard({ config, isDisabled }: GatewayCardProps) {
  const { getGatewayByType, upsertGateway } = usePaymentGatewaySettings();
  const existingGateway = getGatewayByType(config.type);
  
  const [isEnabled, setIsEnabled] = useState(existingGateway?.is_enabled ?? false);
  const [isLiveMode, setIsLiveMode] = useState(existingGateway?.is_live_mode ?? false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (existingGateway) {
      setIsEnabled(existingGateway.is_enabled);
      setIsLiveMode(existingGateway.is_live_mode);
      // Populate form with existing (masked) values
      const initial: Record<string, string> = {};
      config.fields.test.forEach(f => {
        const value = existingGateway[f.key as keyof typeof existingGateway];
        if (value && typeof value === 'string') {
          initial[f.key] = f.isSecret ? '••••••••••••••••' : value;
        }
      });
      config.fields.live.forEach(f => {
        const value = existingGateway[f.key as keyof typeof existingGateway];
        if (value && typeof value === 'string') {
          initial[f.key] = f.isSecret ? '••••••••••••••••' : value;
        }
      });
      setFormData(initial);
    }
  }, [existingGateway, config.fields]);

  const handleFieldChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleToggleEnabled = (checked: boolean) => {
    setIsEnabled(checked);
    setHasChanges(true);
  };

  const handleToggleLiveMode = (checked: boolean) => {
    setIsLiveMode(checked);
    setHasChanges(true);
  };

  const handleSave = () => {
    const data: GatewayFormData = {
      gateway_type: config.type,
      is_enabled: isEnabled,
      is_live_mode: isLiveMode,
    };

    // Only include fields that were actually changed (not masked placeholders)
    Object.entries(formData).forEach(([key, value]) => {
      if (value && !value.includes('••••')) {
        if (key === 'test_api_key') data.test_api_key = value;
        else if (key === 'test_secret_key') data.test_secret_key = value;
        else if (key === 'test_webhook_secret') data.test_webhook_secret = value;
        else if (key === 'live_api_key') data.live_api_key = value;
        else if (key === 'live_secret_key') data.live_secret_key = value;
        else if (key === 'live_webhook_secret') data.live_webhook_secret = value;
      }
    });

    upsertGateway.mutate(data, {
      onSuccess: () => setHasChanges(false),
    });
  };

  const Icon = config.icon;
  const isConfigured = existingGateway && (existingGateway.test_api_key || existingGateway.live_api_key);

  return (
    <AccordionItem value={config.type} className="border rounded-lg px-4 mb-3 bg-card">
      <AccordionTrigger className="hover:no-underline py-4">
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{config.name}</span>
                {isConfigured && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <Check className="h-3 w-3" />
                    Configured
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{config.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-4" onClick={e => e.stopPropagation()}>
            {isEnabled && (
              <Badge variant={isLiveMode ? "default" : "secondary"} className="gap-1">
                {isLiveMode ? (
                  <>
                    <Zap className="h-3 w-3" />
                    Live
                  </>
                ) : (
                  <>
                    <TestTube className="h-3 w-3" />
                    Test
                  </>
                )}
              </Badge>
            )}
            <Switch
              checked={isEnabled}
              onCheckedChange={handleToggleEnabled}
              disabled={isDisabled}
            />
          </div>
        </div>
      </AccordionTrigger>
      
      <AccordionContent className="pb-4">
        <div className="space-y-6 pt-2">
          {/* Mode Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-3">
              {isLiveMode ? (
                <Zap className="h-5 w-5 text-primary" />
              ) : (
                <TestTube className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">
                  {isLiveMode ? 'Live Mode' : 'Test Mode (Sandbox)'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isLiveMode 
                    ? 'Processing real payments with live credentials' 
                    : 'Safe testing environment with sandbox credentials'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Test</span>
              <Switch
                checked={isLiveMode}
                onCheckedChange={handleToggleLiveMode}
                disabled={isDisabled}
              />
              <span className="text-sm text-muted-foreground">Live</span>
            </div>
          </div>

          {/* Warning for Live Mode */}
          {isLiveMode && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Live Mode Active</p>
                <p className="text-sm text-muted-foreground">
                  Real transactions will be processed. Ensure your credentials are correct.
                </p>
              </div>
            </div>
          )}

          {/* Credentials Tabs */}
          <Tabs defaultValue={isLiveMode ? "live" : "test"} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="test" className="gap-2">
                <TestTube className="h-4 w-4" />
                Test Credentials
              </TabsTrigger>
              <TabsTrigger value="live" className="gap-2">
                <Zap className="h-4 w-4" />
                Live Credentials
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="test" className="space-y-4 mt-4">
              {config.fields.test.map(field => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={`${config.type}-${field.key}`}>{field.label}</Label>
                  <div className="relative">
                    <Input
                      id={`${config.type}-${field.key}`}
                      type={field.isSecret && !showSecrets[field.key] ? "password" : "text"}
                      value={formData[field.key] || ''}
                      onChange={e => handleFieldChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      disabled={isDisabled}
                      className="pr-10"
                    />
                    {field.isSecret && (
                      <button
                        type="button"
                        onClick={() => setShowSecrets(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showSecrets[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </TabsContent>
            
            <TabsContent value="live" className="space-y-4 mt-4">
              {config.fields.live.map(field => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={`${config.type}-${field.key}`}>{field.label}</Label>
                  <div className="relative">
                    <Input
                      id={`${config.type}-${field.key}`}
                      type={field.isSecret && !showSecrets[field.key] ? "password" : "text"}
                      value={formData[field.key] || ''}
                      onChange={e => handleFieldChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      disabled={isDisabled}
                      className="pr-10"
                    />
                    {field.isSecret && (
                      <button
                        type="button"
                        onClick={() => setShowSecrets(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showSecrets[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <Button 
              onClick={handleSave}
              disabled={isDisabled || upsertGateway.isPending || !hasChanges}
            >
              {upsertGateway.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </Button>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

interface PaymentGatewaySettingsProps {
  isAdmin: boolean;
}

export function PaymentGatewaySettings({ isAdmin }: PaymentGatewaySettingsProps) {
  const { isLoading } = usePaymentGatewaySettings();

  if (isLoading) {
    return (
      <div className="p-6 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <CreditCard className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold">Payment Gateways</h2>
          <p className="text-sm text-muted-foreground">Configure payment providers and credentials</p>
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {GATEWAY_CONFIGS.map(config => (
          <GatewayCard key={config.type} config={config} isDisabled={!isAdmin} />
        ))}
      </Accordion>

      <p className="text-xs text-muted-foreground mt-4">
        All credentials are encrypted and stored securely. Never share your secret keys.
      </p>
    </div>
  );
}
