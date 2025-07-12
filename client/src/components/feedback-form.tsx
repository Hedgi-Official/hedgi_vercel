import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Send, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from 'react-i18next';

const PROJECT_ID = '407c4b1d302218';

type Status = 'idle' | 'sending' | 'success' | 'error';

export function FeedbackForm() {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [category, setCategory] = useState<'issue' | 'idea' | 'other'>('other');
  const [status, setStatus] = useState<Status>('idle');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setStatus('sending');

    // Format the category label
    const categoryLabels = {
      'idea': 'Idea / Suggestion',
      'issue': 'Bug / Issue',
      'other': 'General Feedback'
    };

    const categoryLabel = categoryLabels[category];
    const formattedText = `[${categoryLabel}] ${text}`;

    try {
      const res = await fetch('https://api.feedback.fish/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: PROJECT_ID,
          text: formattedText,
          category,
          metadata: {},
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setStatus('success');
      setText('');

      toast({
        title: "🎉 Feedback Sent!",
        description: "Thank you for helping us improve Hedgi.",
      });

      // Reset form after success
      setTimeout(() => {
        setStatus('idle');
      }, 3000);

    } catch (err) {
      console.error(err);
      setStatus('error');

      toast({
        title: "Error",
        description: "Couldn't send feedback. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (status === 'success') {
    return (
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('feedback.Feedback Sent!')}</h3>
            <p className="text-muted-foreground">
              {t('feedback.Thank you for helping us improve Hedgi. Your feedback is anonymous and valuable to us.')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          {t('feedback.Anonymous Feedback')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('feedback.Help us improve Hedgi. Your feedback is completely anonymous.')}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feedback-text">{t('feedback.Your Feedback')}</Label>
            <Textarea
              id="feedback-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('feedback.Share your thoughts, suggestions, or report issues...')}
              required
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-category">{t('feedback.Category')}</Label>
            <Select value={category} onValueChange={(value: 'issue' | 'idea' | 'other') => setCategory(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="idea">💡 {t('feedback.Idea / Suggestion')}</SelectItem>
                <SelectItem value="issue">🐛 {t('feedback.Bug / Issue')}</SelectItem>
                <SelectItem value="other">💬 {t('feedback.General Feedback')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={status === 'sending' || !text.trim()}
            className="w-full"
          >
            {status === 'sending' ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {t('feedback.Sending...')}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                {t('feedback.Submit Feedback')}
              </div>
            )}
          </Button>

          {status === 'error' && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {t('feedback.Couldn\'t send feedback. Please try again.')}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}