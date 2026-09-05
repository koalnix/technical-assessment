package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/jung-kurt/gofpdf"
)

// Student mirrors the JSON shape returned by the Node backend's
// GET /api/v1/students/:id endpoint (see backend/src/modules/students/students-repository.js).
type Student struct {
	ID                 int    `json:"id"`
	Name               string `json:"name"`
	Email              string `json:"email"`
	SystemAccess       bool   `json:"systemAccess"`
	Phone              string `json:"phone"`
	Gender             string `json:"gender"`
	DOB                string `json:"dob"`
	Class              string `json:"class"`
	Section            string `json:"section"`
	Roll               *int   `json:"roll"`
	FatherName         string `json:"fatherName"`
	FatherPhone        string `json:"fatherPhone"`
	MotherName         string `json:"motherName"`
	MotherPhone        string `json:"motherPhone"`
	GuardianName       string `json:"guardianName"`
	GuardianPhone      string `json:"guardianPhone"`
	RelationOfGuardian string `json:"relationOfGuardian"`
	CurrentAddress     string `json:"currentAddress"`
	PermanentAddress   string `json:"permanentAddress"`
	AdmissionDate      string `json:"admissionDate"`
	ReporterName       string `json:"reporterName"`
}

type apiError struct {
	Message string `json:"message"`
}

func nodeAPIBaseURL() string {
	if v := os.Getenv("NODE_API_BASE_URL"); v != "" {
		return v
	}
	return "http://localhost:5007/api/v1"
}

func port() string {
	if v := os.Getenv("PORT"); v != "" {
		return v
	}
	return "8080"
}

// fetchStudent calls the Node backend's GET /api/v1/students/:id, forwarding the
// caller's auth cookies and CSRF header untouched. The route is protected by
// authenticateToken + csrfProtection (see backend/src/routes/v1.js), so this
// service acts as a transparent proxy for auth rather than re-implementing login.
func fetchStudent(id string, r *http.Request) (*Student, int, error) {
	url := fmt.Sprintf("%s/students/%s", nodeAPIBaseURL(), id)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return nil, http.StatusInternalServerError, err
	}

	if cookie := r.Header.Get("Cookie"); cookie != "" {
		req.Header.Set("Cookie", cookie)
	}
	if csrf := r.Header.Get("X-CSRF-TOKEN"); csrf != "" {
		req.Header.Set("X-CSRF-TOKEN", csrf)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, http.StatusBadGateway, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, http.StatusBadGateway, err
	}

	if resp.StatusCode != http.StatusOK {
		var apiErr apiError
		_ = json.Unmarshal(body, &apiErr)
		msg := apiErr.Message
		if msg == "" {
			msg = fmt.Sprintf("backend returned status %d", resp.StatusCode)
		}
		return nil, resp.StatusCode, fmt.Errorf("%s", msg)
	}

	var student Student
	if err := json.Unmarshal(body, &student); err != nil {
		return nil, http.StatusBadGateway, err
	}

	return &student, http.StatusOK, nil
}

func formatIntPtr(v *int) string {
	if v == nil {
		return "-"
	}
	return fmt.Sprintf("%d", *v)
}

func addRow(pdf *gofpdf.Fpdf, label, value string) {
	pdf.SetFont("Helvetica", "B", 11)
	pdf.CellFormat(50, 8, label, "", 0, "L", false, 0, "")
	pdf.SetFont("Helvetica", "", 11)
	pdf.CellFormat(0, 8, value, "", 1, "L", false, 0, "")
}

func renderStudentPDF(s *Student) *gofpdf.Fpdf {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	pdf.SetFont("Helvetica", "B", 18)
	pdf.CellFormat(0, 12, "Student Report", "", 1, "L", false, 0, "")
	pdf.Ln(4)

	addRow(pdf, "Name", s.Name)
	addRow(pdf, "Email", s.Email)
	addRow(pdf, "Class", s.Class)
	addRow(pdf, "Section", s.Section)
	addRow(pdf, "Roll", formatIntPtr(s.Roll))
	addRow(pdf, "Gender", s.Gender)
	addRow(pdf, "Date of Birth", s.DOB)
	addRow(pdf, "Phone", s.Phone)
	pdf.Ln(4)

	pdf.SetFont("Helvetica", "B", 13)
	pdf.CellFormat(0, 10, "Guardian Information", "", 1, "L", false, 0, "")
	addRow(pdf, "Father", fmt.Sprintf("%s (%s)", s.FatherName, s.FatherPhone))
	addRow(pdf, "Mother", fmt.Sprintf("%s (%s)", s.MotherName, s.MotherPhone))
	addRow(pdf, "Guardian", fmt.Sprintf("%s (%s) - %s", s.GuardianName, s.GuardianPhone, s.RelationOfGuardian))
	pdf.Ln(4)

	pdf.SetFont("Helvetica", "B", 13)
	pdf.CellFormat(0, 10, "Address", "", 1, "L", false, 0, "")
	addRow(pdf, "Current", s.CurrentAddress)
	addRow(pdf, "Permanent", s.PermanentAddress)
	pdf.Ln(4)

	addRow(pdf, "Admission Date", s.AdmissionDate)
	addRow(pdf, "Class Teacher", s.ReporterName)

	return pdf
}

func handleStudentReport(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	student, status, err := fetchStudent(id, r)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		json.NewEncoder(w).Encode(apiError{Message: err.Error()})
		return
	}

	pdf := renderStudentPDF(student)

	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=student-%s-report.pdf", id))
	if err := pdf.Output(w); err != nil {
		log.Printf("failed to write pdf: %v", err)
	}
}

func uiOrigin() string {
	if v := os.Getenv("UI_URL"); v != "" {
		return v
	}
	return "http://localhost:5173"
}

// withCORS lets the browser-based frontend (a different origin/port) call this
// service directly, e.g. for a "Download PDF Report" button, while still
// sending the student's session cookies + CSRF header along with the request.
func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", uiOrigin())
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-CSRF-TOKEN")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/students/{id}/report", handleStudentReport)

	addr := ":" + port()
	log.Printf("go-service listening on %s (backend=%s, ui=%s)", addr, nodeAPIBaseURL(), uiOrigin())
	if err := http.ListenAndServe(addr, withCORS(mux)); err != nil {
		log.Fatal(err)
	}
}
