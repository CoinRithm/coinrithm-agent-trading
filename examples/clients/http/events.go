package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)

func run() error {
	baseURL := os.Getenv("COINRITHM_BASE_URL")
	if baseURL == "" {
		baseURL = "https://api.coinrithm.com"
	}
	// Public read: no Authorization header. Standard library only.
	client := &http.Client{Timeout: 30 * time.Second}
	response, err := client.Get(strings.TrimRight(baseURL, "/") + "/api/prediction-markets/events?limit=3")
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return fmt.Errorf("API request failed: HTTP %d", response.StatusCode)
	}
	var data map[string]any
	if err := json.NewDecoder(response.Body).Decode(&data); err != nil {
		return err
	}
	if _, ok := data["data"].([]any); !ok {
		return fmt.Errorf("expected an events data array")
	}
	encoder := json.NewEncoder(os.Stdout)
	encoder.SetIndent("", "  ")
	return encoder.Encode(data)
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
