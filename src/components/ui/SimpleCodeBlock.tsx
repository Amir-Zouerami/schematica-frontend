
import React from 'react';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SimpleCodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  caption?: string;
  className?: string;
}

const SimpleCodeBlock: React.FC<SimpleCodeBlockProps> = ({
  code,
  language = 'json',
  showLineNumbers = true,
  caption,
  className
}) => {
  const { toast } = useToast();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code).then(
      () => {
        toast({
          title: 'Copied to clipboard',
          description: 'Code has been copied to your clipboard',
        });
      },
      (err) => {
        toast({
          title: 'Copy failed',
          description: 'Could not copy code to clipboard',
          variant: 'destructive',
        });
      }
    );
  };

  return (
    <div className={cn("relative rounded-md overflow-hidden bg-secondary/40", className)}>
      {caption && (
        <div className="text-xs px-4 py-1 border-b border-border bg-background/50">
          {caption}
        </div>
      )}
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-8 w-8 opacity-70 hover:opacity-100 z-10"
          onClick={copyToClipboard}
        >
          <Copy className="h-4 w-4" />
        </Button>
        <pre className={cn(
          "p-4 overflow-x-auto text-sm",
          language === 'json' && "font-mono"
        )}>
          <code className={`language-${language}`}>
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
};

export default SimpleCodeBlock;
