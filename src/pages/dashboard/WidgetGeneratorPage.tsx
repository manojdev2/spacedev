import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Code, 
  Copy, 
  Check, 
  Eye, 
  Palette, 
  Layout, 
  Settings2, 
  ExternalLink,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

interface WidgetConfig {
  primaryColor: string;
  accentColor: string;
  showSearch: boolean;
  showNearMe: boolean;
  showList: boolean;
  showMap: boolean;
  height: number;
  borderRadius: number;
  showBranding: boolean;
  maxResults: number;
  defaultZoom: number;
}

const defaultConfig: WidgetConfig = {
  primaryColor: '#0d9488',
  accentColor: '#14b8a6',
  showSearch: true,
  showNearMe: true,
  showList: true,
  showMap: true,
  height: 500,
  borderRadius: 12,
  showBranding: true,
  maxResults: 10,
  defaultZoom: 10,
};

const presetThemes = [
  { name: 'Teal (Default)', primary: '#0d9488', accent: '#14b8a6' },
  { name: 'Blue', primary: '#2563eb', accent: '#3b82f6' },
  { name: 'Purple', primary: '#7c3aed', accent: '#8b5cf6' },
  { name: 'Orange', primary: '#ea580c', accent: '#f97316' },
  { name: 'Pink', primary: '#db2777', accent: '#ec4899' },
  { name: 'Green', primary: '#16a34a', accent: '#22c55e' },
  { name: 'Slate', primary: '#475569', accent: '#64748b' },
];

export default function WidgetGeneratorPage() {
  const [config, setConfig] = useState<WidgetConfig>(defaultConfig);
  const [copied, setCopied] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const baseUrl = window.location.origin;

  const widgetUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set('primaryColor', config.primaryColor);
    params.set('accentColor', config.accentColor);
    params.set('showSearch', String(config.showSearch));
    params.set('showNearMe', String(config.showNearMe));
    params.set('showList', String(config.showList));
    params.set('showMap', String(config.showMap));
    params.set('height', `${config.height}px`);
    params.set('borderRadius', `${config.borderRadius}px`);
    params.set('showBranding', String(config.showBranding));
    params.set('maxResults', String(config.maxResults));
    params.set('defaultZoom', String(config.defaultZoom));
    return `${baseUrl}/embed?${params.toString()}`;
  }, [config, baseUrl]);

  const iframeCode = useMemo(() => {
    return `<iframe
  src="${widgetUrl}"
  width="100%"
  height="${config.height}"
  style="border: none; border-radius: ${config.borderRadius}px; overflow: hidden;"
  loading="lazy"
  title="Store Locator"
  allow="geolocation"
></iframe>`;
  }, [widgetUrl, config.height, config.borderRadius]);

  const jsSnippetCode = useMemo(() => {
    return `<!-- LocatePro Store Locator Widget -->
<div id="locatepro-widget"></div>
<script>
  (function() {
    var container = document.getElementById('locatepro-widget');
    var iframe = document.createElement('iframe');
    iframe.src = '${widgetUrl}';
    iframe.style.width = '100%';
    iframe.style.height = '${config.height}px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '${config.borderRadius}px';
    iframe.style.overflow = 'hidden';
    iframe.loading = 'lazy';
    iframe.title = 'Store Locator';
    iframe.allow = 'geolocation';
    container.appendChild(iframe);
  })();
</script>`;
  }, [widgetUrl, config.height, config.borderRadius]);

  const handleCopy = async (code: string, type: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast({
      title: 'Copied!',
      description: `${type} code copied to clipboard.`,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const updateConfig = (updates: Partial<WidgetConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const applyPreset = (primary: string, accent: string) => {
    updateConfig({ primaryColor: primary, accentColor: accent });
  };

  const previewWidth = previewDevice === 'desktop' ? '100%' : previewDevice === 'tablet' ? '768px' : '375px';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Widget Generator</h1>
        <p className="text-muted-foreground mt-1">
          Create an embeddable store locator widget for any website
        </p>
      </div>

      <div className="grid xl:grid-cols-[400px_1fr] gap-6">
        {/* Configuration Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Widget Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Color Theme */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Color Theme
                </Label>
                <div className="flex flex-wrap gap-2">
                  {presetThemes.map((theme) => (
                    <button
                      key={theme.name}
                      onClick={() => applyPreset(theme.primary, theme.accent)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        config.primaryColor === theme.primary 
                          ? 'border-foreground scale-110' 
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: theme.primary }}
                      title={theme.name}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Primary</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="color"
                        value={config.primaryColor}
                        onChange={(e) => updateConfig({ primaryColor: e.target.value })}
                        className="w-10 h-9 p-1 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={config.primaryColor}
                        onChange={(e) => updateConfig({ primaryColor: e.target.value })}
                        className="flex-1 h-9 text-xs font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Accent</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        type="color"
                        value={config.accentColor}
                        onChange={(e) => updateConfig({ accentColor: e.target.value })}
                        className="w-10 h-9 p-1 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={config.accentColor}
                        onChange={(e) => updateConfig({ accentColor: e.target.value })}
                        className="flex-1 h-9 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Layout Options */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Layout className="h-4 w-4" />
                  Layout Options
                </Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showSearch" className="text-sm font-normal">Show Search Bar</Label>
                    <Switch
                      id="showSearch"
                      checked={config.showSearch}
                      onCheckedChange={(checked) => updateConfig({ showSearch: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showNearMe" className="text-sm font-normal">Show Near Me Button</Label>
                    <Switch
                      id="showNearMe"
                      checked={config.showNearMe}
                      onCheckedChange={(checked) => updateConfig({ showNearMe: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showList" className="text-sm font-normal">Show Location List</Label>
                    <Switch
                      id="showList"
                      checked={config.showList}
                      onCheckedChange={(checked) => updateConfig({ showList: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showMap" className="text-sm font-normal">Show Map</Label>
                    <Switch
                      id="showMap"
                      checked={config.showMap}
                      onCheckedChange={(checked) => updateConfig({ showMap: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showBranding" className="text-sm font-normal">Show LocatePro Branding</Label>
                    <Switch
                      id="showBranding"
                      checked={config.showBranding}
                      onCheckedChange={(checked) => updateConfig({ showBranding: checked })}
                    />
                  </div>
                </div>
              </div>

              {/* Size Settings */}
              <div className="space-y-3">
                <Label>Widget Height: {config.height}px</Label>
                <Slider
                  value={[config.height]}
                  onValueChange={([value]) => updateConfig({ height: value })}
                  min={300}
                  max={800}
                  step={10}
                />
              </div>

              <div className="space-y-3">
                <Label>Border Radius: {config.borderRadius}px</Label>
                <Slider
                  value={[config.borderRadius]}
                  onValueChange={([value]) => updateConfig({ borderRadius: value })}
                  min={0}
                  max={24}
                  step={2}
                />
              </div>

              <div className="space-y-3">
                <Label>Max Results</Label>
                <Select
                  value={String(config.maxResults)}
                  onValueChange={(value) => updateConfig({ maxResults: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 locations</SelectItem>
                    <SelectItem value="10">10 locations</SelectItem>
                    <SelectItem value="20">20 locations</SelectItem>
                    <SelectItem value="50">50 locations</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Reset Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setConfig(defaultConfig)}
              >
                Reset to Defaults
              </Button>
            </CardContent>
          </Card>

          {/* Embed Code */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Code className="h-5 w-5" />
                Embed Code
              </CardTitle>
              <CardDescription>
                Copy and paste this code into your website
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="iframe">
                <TabsList className="w-full">
                  <TabsTrigger value="iframe" className="flex-1">iFrame</TabsTrigger>
                  <TabsTrigger value="js" className="flex-1">JavaScript</TabsTrigger>
                </TabsList>
                <TabsContent value="iframe" className="mt-3">
                  <div className="relative">
                    <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto max-h-40">
                      <code>{iframeCode}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute top-2 right-2"
                      onClick={() => handleCopy(iframeCode, 'iFrame')}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="js" className="mt-3">
                  <div className="relative">
                    <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto max-h-40">
                      <code>{jsSnippetCode}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute top-2 right-2"
                      onClick={() => handleCopy(jsSnippetCode, 'JavaScript')}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => window.open(widgetUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in New Tab
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Preview
              </CardTitle>
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Button
                  variant={previewDevice === 'desktop' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setPreviewDevice('desktop')}
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  variant={previewDevice === 'tablet' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setPreviewDevice('tablet')}
                >
                  <Tablet className="h-4 w-4" />
                </Button>
                <Button
                  variant={previewDevice === 'mobile' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setPreviewDevice('mobile')}
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription>
              See how your widget will look on different devices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              className="mx-auto transition-all duration-300 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg"
              style={{ maxWidth: previewWidth }}
            >
              <motion.div
                key={JSON.stringify(config)}
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <iframe
                  src={widgetUrl}
                  width="100%"
                  height={config.height}
                  style={{ 
                    border: 'none', 
                    borderRadius: `${config.borderRadius}px`,
                    overflow: 'hidden',
                  }}
                  title="Widget Preview"
                  allow="geolocation"
                />
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
