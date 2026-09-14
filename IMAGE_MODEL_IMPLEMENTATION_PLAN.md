# Image Model Agent Team — Implementation Plan

**Status:** Implemented and verified  
**Scope:** Creation Playground image-model extension; existing Vision OCR and LLM fine-tuning remain unchanged.

## Delivery plan

1. **Role-filtered Playground surface**
   - Reuse `NodeRegistry`, canvas, properties panel, execution engine, and saved workflows.
   - Admin receives training/deployment and specialist test nodes.
   - Manager and Employee receive `Add Image` and the composed `Image Model` node.
   - Auditor is denied at the Playground API and has no creation sidebar entry.

2. **Capture and catalog ingestion**
   - `ImageCaptureControl` supports camera/gallery inputs, previews, removal, multiple labeled training images, and a 20 MB per-image limit.
   - Admin training accepts PDF/DOCX/TXT manuals and labeled image uploads.
   - v1 training is catalog indexing: manual text and labeled-image captions are stored in a dedicated image-model catalog; no CNN/LoRA claim is made.

3. **Three-agent pipeline**
   - `HardwareManualAgent` retrieves only from the image-model catalog.
   - `ImageAnalysisAgent` extends local Computer Vision/OCR into the structured feature card.
   - `ComparisonPredictionAgent` ranks catalog matches against observed features and the user query.
   - Missing OCR/VLM evidence leaves metal, lifespan, and other unsupported fields empty.

4. **Private LAN and deployment controls**
   - Admin-only train/deploy routes and training node.
   - Active-LAN deployment stores network metadata and reuses the shared department recipient helper.
   - Inference and image-model canvas runs require `userIsConnectedToLan(userId)` for every role, including Admin.
   - API denial is HTTP 403 with `requiresLanMembership: true`; the Playground disables Run and shows the LAN lock message.

5. **Notification and navigation**
   - Deploy sends `IMAGE_MODEL_DEPLOYED` to Manager/Employee recipients in the model department.
   - Bell styling is reused; opening marks read and navigates to Creation Playground using `openTab`/`focusNode` metadata.

## Verification checklist

- Manager/Employee node list excludes `train.image-model` and Admin specialist test nodes.
- Auditor cannot list or run Playground/image-model routes.
- Offline inference is denied for Manager, Employee, and Admin.
- Deploy fan-out reaches active Manager/Employee accounts in the target department, not other departments.
- Feature-card output does not invent metal or service life when OCR/VLM/catalog evidence is absent.
- `server/test/imageModel.test.js` covers role filtering, deploy fan-out, notification metadata, LAN denial, and no-fake-spec behavior.
- Client production build and focused lint pass.

## Deliberate v1 boundaries

- Training remains local catalog preparation (`prepare → index → validate → complete`); a live GPU classifier is not claimed.
- Optional local VLM use is delegated to the existing `ComputerVisionService` configuration.
- Existing generic Vision OCR and LLM fine-tuning flows are not replaced.
