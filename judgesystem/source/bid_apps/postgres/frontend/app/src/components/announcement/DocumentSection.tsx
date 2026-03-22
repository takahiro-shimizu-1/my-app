import { Box, Typography, Button, Accordion, AccordionSummary, AccordionDetails, CircularProgress } from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  OpenInNew as OpenInNewIcon,
  TextSnippet as TextSnippetIcon,
} from '@mui/icons-material';
import { getDocumentTypeConfig, getFileFormatConfig } from '../../constants/documentType';
import { colors, fontSizes, iconStyles, borderRadius } from '../../constants/styles';
import type { DocumentOcr } from '../../types';

type PreviewState = { url?: string; loading: boolean; error?: string };

interface DocumentSectionProps {
  documents: DocumentOcr[];
  documentPreviewState: Record<string, PreviewState>;
  loadPdfPreview: (documentId: number, options?: { force?: boolean }) => void;
}

export function DocumentSection({
  documents,
  documentPreviewState,
  loadPdfPreview,
}: DocumentSectionProps) {
  return (
    <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {documents.map((doc: DocumentOcr, index: number) => {
        const typeConfig = getDocumentTypeConfig(doc.type || 'other');
        const formatConfig = getFileFormatConfig(doc.fileFormat);
        const isPdfDocument = doc.fileFormat && doc.fileFormat.toLowerCase() === 'pdf';
        const docId = doc.id;
        const docKey = String(docId);
        const previewState = documentPreviewState[docKey];
        const isPreviewLoading = previewState?.loading;
        const previewUrl = previewState?.url;
        const previewError = previewState?.error;
        return (
          <Accordion
            key={doc.id}
            defaultExpanded={index === 0}
            onChange={(_, expanded) => {
              if (expanded && isPdfDocument) {
                loadPdfPreview(docId);
              }
            }}
            sx={{
              backgroundColor: colors.text.white,
              border: `1px solid ${colors.border.main}`,
              borderRadius: `${borderRadius.xs} !important`,
              boxShadow: 'none',
              '&:before': { display: 'none' },
              '&.Mui-expanded': { margin: 0 },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: colors.text.muted }} />}
              sx={{
                px: 2.5,
                py: 0.5,
                minHeight: 48,
                borderBottom: `1px solid ${colors.border.main}`,
                '& .MuiAccordionSummary-content': { alignItems: 'center', gap: 1.5, my: 1 },
              }}
            >
              <TextSnippetIcon sx={{ ...iconStyles.medium, color: colors.text.light }} />
              <Typography sx={{ fontSize: fontSizes.md, fontWeight: 600, color: colors.text.secondary }}>{doc.title}</Typography>
              <Typography sx={{ fontSize: fontSizes.md, fontWeight: 600, color: typeConfig.color, backgroundColor: typeConfig.bgColor, px: 1, py: 0.25, borderRadius: '2px' }}>
                {typeConfig.label}
              </Typography>
              {doc.url && (
                <Button
                  variant="outlined"
                  size="small"
                  endIcon={<OpenInNewIcon sx={iconStyles.small} />}
                  component="a"
                  href={doc.url}
                  target="_blank"
                  onClick={(e) => e.stopPropagation()}
                  sx={{ borderRadius: borderRadius.xs, borderColor: formatConfig.color, color: formatConfig.color, fontWeight: 500, fontSize: fontSizes.xs, textTransform: 'none', py: 0.25, px: 1 }}
                >
                  {formatConfig.label}
                </Button>
              )}
              {doc.pageCount && <Typography sx={{ fontSize: fontSizes.md, color: colors.text.light, ml: 'auto', mr: 1 }}>{doc.pageCount}ページ</Typography>}
            </AccordionSummary>
            <AccordionDetails sx={{ p: 2.5, backgroundColor: colors.background.paper, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {isPdfDocument && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 600, color: colors.text.secondary }}>PDFプレビュー</Typography>
                  {isPreviewLoading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px dashed ${colors.border.main}`, borderRadius: borderRadius.xs, height: 400, backgroundColor: colors.text.white }}>
                      <CircularProgress size={28} sx={{ color: colors.primary.main, mr: 1.5 }} />
                      <Typography sx={{ fontSize: fontSizes.md, color: colors.text.muted }}>プレビューを読み込み中です...</Typography>
                    </Box>
                  ) : previewError ? (
                    <Box sx={{ border: `1px solid ${colors.status.error.light}`, borderRadius: borderRadius.xs, p: 2, backgroundColor: '#fff5f5', display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography sx={{ fontSize: fontSizes.md, fontWeight: 600, color: colors.status.error.main }}>
                        プレビューの読み込みに失敗しました
                      </Typography>
                      <Typography sx={{ fontSize: fontSizes.sm, color: colors.text.light }}>
                        {previewError}
                      </Typography>
                      <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.muted }}>
                        ファイルが存在しないか、アクセス権限が不足している可能性があります。
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            loadPdfPreview(docId, { force: true });
                          }}
                          sx={{ borderRadius: borderRadius.xs }}
                        >
                          再読み込み
                        </Button>
                        {doc.url && (
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(doc.url, '_blank');
                            }}
                            sx={{ borderRadius: borderRadius.xs }}
                          >
                            元のURLを開く
                          </Button>
                        )}
                      </Box>
                    </Box>
                  ) : previewUrl ? (
                    <Box
                      component="iframe"
                      title={`${doc.title} プレビュー`}
                      src={previewUrl}
                      sx={{
                        width: '100%',
                        height: 420,
                        border: `1px solid ${colors.border.main}`,
                        borderRadius: borderRadius.xs,
                        backgroundColor: colors.text.white,
                      }}
                    />
                  ) : (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        loadPdfPreview(docId);
                      }}
                      sx={{ alignSelf: 'flex-start', borderRadius: borderRadius.xs }}
                    >
                      PDFプレビューを読み込む
                    </Button>
                  )}
                </Box>
              )}
              <Box sx={{ border: `1px solid ${colors.border.main}`, borderRadius: borderRadius.xs, maxHeight: 420, overflow: 'auto', backgroundColor: colors.text.white, p: 2 }}>
                <Typography component="pre" sx={{ fontSize: fontSizes.md, color: colors.text.muted, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', margin: 0, lineHeight: 1.8 }}>
                  {doc.content || '文字起こしデータがありません'}
                </Typography>
              </Box>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}
